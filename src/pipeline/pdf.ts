import * as fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function cleanText(s: string): string {
    // remove non-printables, collapse whitespace
    return s
        .replace(/[^\S\r\n]+/g, ' ')         // collapse spaces/tabs
        .replace(/[\u0000-\u001F\u007F]/g, '') // control chars
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

export async function readPdfText(path: string): Promise<string> {
    const buf = await fs.readFile(path); // Buffer
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

    // disableWorker via cast (Node-safe)
    const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: true } as any);
    const doc = await loadingTask.promise;

    let parts: string[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        // normalize whitespace helps in many PDFs
        const content = await page.getTextContent({ normalizeWhitespace: true } as any);

        const text = content.items
            .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
            .filter(Boolean)
            .join(' ');

        const cleaned = cleanText(text);
        if (cleaned) parts.push(cleaned);
    }

    return cleanText(parts.join('\n\n'));
}
