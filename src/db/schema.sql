CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,             -- 'cv' | 'report' | 'system'
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  uploaded_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_title TEXT NOT NULL,
  cv_file_id INTEGER NOT NULL,
  report_file_id INTEGER NOT NULL,
  status TEXT DEFAULT 'queued',
  error TEXT
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  cv_match_rate REAL NOT NULL,
  cv_feedback TEXT NOT NULL,
  project_score REAL NOT NULL,
  project_feedback TEXT NOT NULL,
  overall_summary TEXT NOT NULL
  ux_results_jobId INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS vectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,     -- filename#chunk
  source TEXT NOT NULL,
  embedding TEXT NOT NULL,  -- JSON array string
  text TEXT NOT NULL
);
