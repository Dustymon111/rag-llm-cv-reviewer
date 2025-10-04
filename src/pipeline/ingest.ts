import { readdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import { readPdfText } from './pdf.js';
import { ingestDocs } from './retrieval.js';

function chunk(text: string, size = 900, overlap = 150) {
    const words = text.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    for (let i = 0; i < words.length; i += (size - overlap)) {
        const piece = words.slice(i, i + size).join(' ').trim();
        if (piece.length >= 40) out.push(piece);
    }
    return out;
}


async function pdfToText(path: string) {
    return readPdfText(path);
}

(async () => {
    const base = resolve('data/system_docs');

    // Read every *.pdf directly under data/system_docs (files only, case-insensitive)
    const pdfs = readdirSync(base, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.pdf'))
        .map((d) => join(base, d.name));

    if (pdfs.length === 0) {
        console.warn(`[ingest] no PDFs found in ${base}`);
    }

    const docs: { id: string; source: string; text: string }[] = [];

    for (const p of pdfs) {
        try {
            const text = await pdfToText(p);
            const parts = chunk(text);
            const fname = basename(p); // just the filename (e.g., job_descriptions.pdf)
            parts.forEach((t, i) => {
                docs.push({ id: `${fname}#${i}`, source: fname, text: t });
            });
            console.log(`[ingest] ${fname} → ${parts.length} chunks`);
        } catch (e) {
            console.error(`[ingest] failed to parse ${p}:`, (e as Error).message);
        }
    }

    if (docs.length === 0) {
        console.error('[ingest] no chunks parsed; nothing to insert');
        process.exit(1);
    }

    await ingestDocs(docs);
    console.log('Ingested chunks:', docs.length);
})();
