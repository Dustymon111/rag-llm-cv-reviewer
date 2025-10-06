import { Queue, Worker, QueueEvents, type JobsOptions } from 'bullmq';
import { db } from '../db/client.ts';
import { jobs as jobsTable, results as resultsTable, files as filesTable } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { runPipeline } from '../pipeline/evaluate.ts';
import { Redis } from 'ioredis';
import { fromBullTimestamp } from '../utils/stopwatch.ts';

import 'dotenv/config';

console.log('[env] LLM_PROVIDER =', process.env.LLM_PROVIDER);
console.log('[env] GROQ_BASE_URL =', process.env.GROQ_BASE_URL);
console.log('[env] GROQ_MODEL    =', process.env.GROQ_MODEL);
console.log('[env] GROQ_API_KEY? =', process.env.GROQ_API_KEY ? 'present' : 'missing');


(async () => {
    try {
        const ping = new Redis(process.env.REDIS_URL!)
        const pong = await ping.ping()
        console.log(`[worker] booting… redis ping: ${pong}`);
    } catch (e: any) {
        console.error('[worker] cannot reach Redis:', e?.message || e);
    }
})();


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
    const sw = fromBullTimestamp(job.timestamp);
    const { jobId } = job.data as { jobId: number };

    console.log(`[worker] job ${job.id} attempt ${job.attemptsMade + 1}/${job.opts.attempts}`);

    try {
        await db.update(jobsTable).set({ status: 'active', error: null }).where(eq(jobsTable.id, jobId));

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
        }).onConflictDoNothing({ target: resultsTable.jobId });

        const t = sw.endNow();
        await db.update(jobsTable)
            .set({ status: 'completed', finishedAt: new Date(t.finished), totalMs: t.totalMs })
            .where(eq(jobsTable.id, job.data.jobId));

    } catch (err: any) {
        const t = sw.endNow();
        await db.update(jobsTable)
            .set({ status: 'failed', error: String(err?.message ?? err), finishedAt: new Date(t.finished), totalMs: t.totalMs })
            .where(eq(jobsTable.id, job.data.jobId));
        throw err;
    }
}, { connection: { url: process.env.REDIS_URL! }, concurrency: 2 });


worker.on('ready', () => console.log('[worker] ready (listening for jobs)'));


worker.on('failed', async (job, err) => {
    console.log("Job has failed, retrying for 3 attempts");
});


worker.on('completed', async (job) => {
    console.log("Job has been completed");
});
