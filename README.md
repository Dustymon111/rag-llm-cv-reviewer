# AI CV & Project Evaluator (Node.js + RAG)

A backend service that:
- parses CV and Project Report PDFs,
- retrieves ground truth from Job Description & Case Study Brief (+ optional rubrics) via a local vector store (SQLite),
- uses an LLM (Groq) to score and give feedback,
- runs asynchronously with BullMQ + Redis,

- returns a final, strict-JSON evaluation.

# Features

1. Upload CV & Project Report as PDFs (/upload)

2. Queue an evaluation (/evaluate) — non-blocking; worker does the heavy lifting

3. Retrieve results (/result/:id) — JSON: CV match, project score, feedback, summary

4. RAG over ground-truth PDFs (Job Description, Brief, Rubrics)

5. Local embeddings with Xenova

6. Retry & backoff (Job Level)

7. Stopwatch (optional): queue→complete timing

# Architecture

- API: Node.js + Express

- Worker: BullMQ (Redis-backed queue)

- Queue: Redis (Docker)

- DB: SQLite + Drizzle ORM

- PDF parsing: pdfjs-dist (Node legacy build)

- Embeddings: Xenova all-MiniLM-L6-v2

- LLM: Groq (OpenAI-compatible API)


# Requirements

- Node.js 20+
- Docker Desktop (for Redis)
- Groq API key (free tier)

# Environment

```bash
## Create .env (no quotes around values):
PORT=8000
REDIS_URL=redis://127.0.0.1:6379
## SQLite path (if you use a custom one)
SQLITE_PATH=./abc.db
## Groq (OpenAI-compatible)
LLM_PROVIDER=groq
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.1-8b-instant (You could choose other models)
GROQ_API_KEY=gsk_******************************** (Create groq API KEY first)
```

# Install & Setup
## Clone & install
```bash
git clone https://github.com/Dustymon111/rag-llm-cv-reviewer
cd llm-rag-cv-reviewer
npm ci
## Start Redis (Docker)
docker run -p 6379:6379 --name redis -d redis:7
```
# Create the Database

### Using Drizzle (recommended):

Fastest dev path:
```bash
npx drizzle-kit push
```
## OR, if you want migration files:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

# Running The App
Please mind that you have to run the redis container first for the worker and server to run   correctly.
### Open two terminals:
#### A) Worker (queue consumer):
```bash
npm run worker:dev

## [worker] ready (listening for jobs)
```

#### B) API server:

```bash
npm run dev

# API on :8000
```

## Verify
### Prepare Ground-Truth PDFs

Put Ground Truth PDFs under data/system_docs/, after you npm run dev to initiate multer to create the folders:
- job_descriptions.pdf
- case_study_brief.pdf
- cv_scoring_rubric.pdf
- project_scoring_rubric.pdf

#### If a PDF is image-only, OCR it first so text can be parsed.

## Ingest System Docs (build the vector store)
```bash
npm run ingest
```

You should see logs like:
```bash
[ingest] job_descriptions.pdf → 2 chunks
[ingest] case_study_brief.pdf → 3 chunks
Ingested chunks: 5
```

# Usage (Upload → Evaluate → Get Result)
Note: You can use API Platform such as Postman to upload the files easier.
### 1) Upload PDFs (multipart form)
```bash
## Windows PowerShell

$TOKEN = "gsk_...your_token..."
curl.exe -X POST "http://localhost:8000/upload" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "cv=@F:\path\to\CV.pdf;type=application/pdf" `
  -F "report=@F:\path\to\report.pdf;type=application/pdf"


## macOS/Linux (or Git Bash)

TOKEN="gsk_...your_token..."
curl -X POST "http://localhost:8000/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "cv=@/path/to/CV.pdf;type=application/pdf" \
  -F "report=@/path/to/report.pdf;type=application/pdf"

## Response
## {"cv_id":1,"report_id":2}
```
### 2) Enqueue an Evaluation (non-blocking)

Note: Use the cv_id and report_id from /upload.


```bash
# Mind that cv_id and report_id will be obtained on JSON after uploading cv and report in /upload
## Adjust job_title into the one that you want to apply
## adjust cv_id and report_id value that you get after /upload (usually it will be 1 & 2, 3 & 4, 5 & 6, ...)

## Windows PowerShell
$body = @{ job_title = "Backend Engineer"; cv_id = 1; report_id = 2 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/evaluate" -ContentType "application/json" -Body $body

## macOS/Linux
curl -X POST "http://localhost:8000/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"job_title":"Backend Engineer","cv_id":1,"report_id":2}'

## Response
## {"id":6,"status":"queued"}
## /evaluate returns immediately. The worker runs the chain in the background.
```

## 3) Poll the Result
```bash
## Windows PowerShell
curl "http://localhost:8000/result/6"
```

You’ll see queued → completed (or failed).

On success:
```bash
{
  "id": 6,
  "status": "completed",
  "result": {
    "cv_match_rate": 0.59,
    "cv_feedback": "…",
    "project_score": 3.9,
    "project_feedback": "…",
    "overall_summary": "…"
  }
}
```

### Optional Debug
#### Vector store counts
```bash
GET /debug/vectors
```

## Scripts (common)
```bash
{
"scripts": {
    "dev": "tsx watch src/server.ts",
    "worker:dev": "tsx watch src/queue/worker.ts",
    "ingest": "tsx src/pipeline/ingest.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
},
```

# Troubleshooting

### CV file X not found
- You reset the DB; re-upload via /upload to get new cv_id/report_id, then re-run /evaluate.

#### 404 The model ... does not exist
Ensure:
- GROQ_BASE_URL=https://api.groq.com/openai/v1
- GROQ_MODEL=llama-3.1-8b-instant
- GROQ_API_KEY=gsk_… (no “Bearer ”)

#### Scanned PDFs → empty text
OCR the PDFs first so readPdfText can extract text.

#### Job IDs keep increasing
That’s Redis. To reset (dev only):
```bash
docker exec -it redis redis-cli FLUSHALL
```

# Reset (Dev)

### Full fresh run:
```bash
## reset DB
rm -f ai_eval.db
npx drizzle-kit push

## reset Redis (clears queues & counters)
docker exec -it redis redis-cli FLUSHALL

## re-ingest ground-truth PDFs
npm run ingest

## start services
npm run worker:dev
npm run dev
```




