import { Router } from 'express';
import { db } from '../db/client.js';
import { jobs, results } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ensureOne, takeFirst } from '../utils/db.js';


export const resultRouter = Router();


resultRouter.get('/result/:id', async (req, res) => {
    const id = Number(req.params.id);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return res.status(404).json({ error: 'job not found' });
    const body: any = { id: job.id, status: job.status };
    if (job.status === 'completed') {
        const row = takeFirst(await db.select().from(results).where(eq(results.jobId, job.id)));
        if (!row) {
            // If your worker always inserts a result before marking completed,
            // you can treat this as a data error:
            return res.status(500).json({ error: 'result not found for completed job' });
        }
        body.result = {
            cv_match_rate: row.cvMatchRate,
            cv_feedback: row.cvFeedback,
            project_score: row.projectScore,
            project_feedback: row.projectFeedback,
            overall_summary: row.overallSummary
        };
    }
    if (job.error) body.error = job.error;
    res.json(body);
});