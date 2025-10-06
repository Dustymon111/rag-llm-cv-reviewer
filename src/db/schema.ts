import { sqliteTable, integer, text, unique, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const files = sqliteTable('files', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind').notNull(), // 'cv' | 'report' | 'system'
    filename: text('filename').notNull(),
    path: text('path').notNull(),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' })
        .default(sql`(strftime('%s','now') * 1000)`),
});

export const jobs = sqliteTable('jobs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobTitle: text('job_title').notNull(),
    cvFileId: integer('cv_file_id').notNull(),
    reportFileId: integer('report_file_id').notNull(),
    status: text('status').default('queued'),
    error: text('error'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    totalMs: real('total_ms'),
});


export const results = sqliteTable('results', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobId: integer('job_id').notNull(),
    cvMatchRate: integer('cv_match_rate'),
    cvFeedback: text('cv_feedback'),
    projectScore: integer('project_score'),
    projectFeedback: text('project_feedback'),
    overallSummary: text('overall_summary')
}, (t) => ({
    uxResultsJobId: unique('ux_results_jobId').on(t.jobId),
}));


export const vectors = sqliteTable('vectors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    docId: text('doc_id').notNull(), // e.g. filename#chunk
    source: text('source').notNull(),
    embedding: text('embedding').notNull(), // JSON string
    text: text('text').notNull()
});