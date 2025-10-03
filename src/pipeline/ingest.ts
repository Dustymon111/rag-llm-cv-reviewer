import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { readPdfText } from './pdf.js';
import { ingestDocs } from './retrieval.js';


function chunk(text: string, size = 900, overlap = 150) {
    const words = text.split(/\s+/);
    const out: string[] = [];
    for (let i = 0; i < words.length; i += (size - overlap)) {
        out.push(words.slice(i, i + size).join(' '));
    }
    return out;
}



async function pdfToText(path: string) {
    return readPdfText(path);
}


(async () => {
    const base = 'data/system_docs';
    const pdfs = [
        ...readdirSync(join(base, 'job_descriptions'), { withFileTypes: true })
            .filter(f => f.name.endsWith('.pdf')).map(f => join(base, 'job_descriptions', f.name)),
        join(base, 'case_study_brief.pdf'),
        join(base, 'scoring_rubrics.pdf')
    ].filter(Boolean);


    const docs: { id: string, source: string, text: string }[] = [];
    for (const p of pdfs) {
        try {
            const text = await pdfToText(p);
            const parts = chunk(text);
            parts.forEach((t, i) => docs.push({ id: `${p}#${i}`, source: p.split('/').pop()!, text: t }));
        } catch { }
    }
    await ingestDocs(docs);
    console.log('Ingested chunks:', docs.length);
})();