import { Router } from 'express';
import { db } from '../db/client.js';
import { vectors } from '../db/schema.js';

export const debugRouter = Router();
debugRouter.get('/debug/vectors', async (_req, res) => {
    const rows = await db.select().from(vectors);
    const bySource: Record<string, number> = {};
    for (const r of rows as any[]) bySource[r.source] = (bySource[r.source] || 0) + 1;
    res.json({
        total: rows.length,
        bySource,
        sample: rows.map((r: any) => ({
            id: r.id, source: r.source, preview: r.text.slice(0, 120) + (r.text.length > 120 ? '…' : '')
        }))
    });
});