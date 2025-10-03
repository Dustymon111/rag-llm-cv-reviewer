import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
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
    error: text('error')
});


export const results = sqliteTable('results', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobId: integer('job_id').notNull(),
    cvMatchRate: real('cv_match_rate').notNull(),
    cvFeedback: text('cv_feedback').notNull(),
    projectScore: real('project_score').notNull(),
    projectFeedback: text('project_feedback').notNull(),
    overallSummary: text('overall_summary').notNull()
});


export const vectors = sqliteTable('vectors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    docId: text('doc_id').notNull(), // e.g. filename#chunk
    source: text('source').notNull(),
    embedding: text('embedding').notNull(), // JSON string
    text: text('text').notNull()
});