import { Router } from 'express';
import { db } from '../db/client.js';
import { jobs } from '../db/schema.js';
import { enqueueEval } from '../queue/queue.js';
import { ensureOne } from '../utils/db.js';


export const evaluateRouter = Router();


evaluateRouter.post('/evaluate', async (req, res) => {
    const { job_title, cv_id, report_id } = req.body || {};
    if (!job_title || !cv_id || !report_id) return res.status(400).json({ error: 'job_title, cv_id, report_id required' });

    // Database Insertion
    const row = await db.insert(jobs).values({ jobTitle: job_title, cvFileId: Number(cv_id), reportFileId: Number(report_id), status: 'queued' }).returning();

    // Undefine Checking
    const { id } = ensureOne(row, 'Insert failed: no job row returned');

    await enqueueEval(id);
    res.json({ id: id, status: 'queued' });
});