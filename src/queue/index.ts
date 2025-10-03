import { Queue, Worker, QueueEvents, type JobsOptions } from 'bullmq';
import { db } from '../db/client.js';
import { jobs as jobsTable, results as resultsTable, files as filesTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { runPipeline } from '../pipeline/evaluate.js';


const connection = { url: process.env.REDIS_URL } as any;
export const evalQueue = new Queue('eval', { connection });
export const qEvents = new QueueEvents('eval', { connection });
type EvalJobData = { jobId: number };

//Undefined check helper
function ensureOne<T>(rows: T[], msg: string): T {
    const row = rows[0];
    if (!row) throw new Error(msg);
    return row;
}

// Worker
export const worker = new Worker<EvalJobData>('eval', async (job) => {
    const { jobId } = job.data as { jobId: number };

    try {
        const jobRow = ensureOne(
            await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)),
            `Job ${jobId} not found`
        );

        const cvRow = ensureOne(
            await db.select().from(filesTable).where(eq(filesTable.id, jobRow.cvFileId)),
            `CV file ${jobRow.cvFileId} not found`
        );

        const rpRow = ensureOne(
            await db.select().from(filesTable).where(eq(filesTable.id, jobRow.reportFileId)),
            `Report file ${jobRow.reportFileId} not found`
        );

        const out = await runPipeline(jobRow.jobTitle, cvRow.path, rpRow.path);

        await db.insert(resultsTable).values({
            jobId: jobRow.id,
            cvMatchRate: out.result.cv_match_rate,
            cvFeedback: out.result.cv_feedback,
            projectScore: out.result.project_score,
            projectFeedback: out.result.project_feedback,
            overallSummary: out.result.overall_summary
        });
    } catch (err: any) {
        await db.update(jobsTable)
            .set({ status: 'failed', error: String(err?.message ?? err) })
            .where(eq(jobsTable.id, jobId));
        throw err; // keep BullMQ aware of the failure (for retries)
    }
}, { connection: { url: process.env.REDIS_URL! }, concurrency: 2 });


worker.on('failed', async (job, err) => {
    const id = (job?.data as any)?.jobId; if (!id) return;
    await db.update(jobsTable).set({ status: 'failed', error: err.message }).where(eq(jobsTable.id, id));
});


worker.on('completed', async (job) => {
    const id = (job?.data as any)?.jobId; if (!id) return;
    await db.update(jobsTable).set({ status: 'completed' }).where(eq(jobsTable.id, id));
});


export async function enqueueEval(jobId: number) {
    const opts: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 2000 } };
    await evalQueue.add('evaluate', { jobId }, opts);
}