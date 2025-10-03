import { Router } from 'express';
import { upload } from '../storage/file.ts';
import { db } from '../db/client.js';
import { files } from '../db/schema.js';
import { ensureOne } from '../utils/db.js';


export const uploadRouter = Router();


uploadRouter.post(
    '/upload',
    upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'report', maxCount: 1 }]),
    async (req, res) => {
        const cv = (req.files as any)?.cv?.[0];
        const rp = (req.files as any)?.report?.[0];

        if (!cv || !rp) return res.status(400).json({ error: 'Both files must be provided' });
        if (!cv.originalname?.endsWith('.pdf') || !rp.originalname?.endsWith('.pdf')) {
            return res.status(400).json({ error: 'PDF only' });
        }

        const cvRows = await db
            .insert(files)
            .values({ kind: 'cv', filename: cv.originalname, path: cv.path })
            .returning({ id: files.id });

        const rpRows = await db
            .insert(files)
            .values({ kind: 'report', filename: rp.originalname, path: rp.path })
            .returning({ id: files.id });

        const { id: cv_id } = ensureOne(cvRows, 'Insert failed: cv row missing');
        const { id: report_id } = ensureOne(rpRows, 'Insert failed: report row missing');

        res.json({ cv_id, report_id });
    }
);