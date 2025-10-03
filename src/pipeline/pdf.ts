// src/pipeline/pdf.ts
import * as fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Do NOT set GlobalWorkerOptions.workerSrc in Node.
// Just disable the worker per document via init params (cast to any).

export async function readPdfText(path: string): Promise<string> {
    const data = await fs.readFile(path);

    // TS types for pdfjs don't include `disableWorker`, so cast to any.
    // This runs fine in Node and avoids the worker entirely.
    const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true } as any);

    const doc = await loadingTask.promise;
    let text = '';

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const strings = content.items
            .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
            .filter(Boolean);
        text += strings.join(' ') + '\n\n';
    }

    return text.trim();
}
