import { readFile } from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfParse: (buf: Buffer) => Promise<{ text?: string }> = require('pdf-parse');

function cleanText(s: string): string {
    return s
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

export async function readPdfText(path: string): Promise<string> {
    const buf = await readFile(path);
    const res = await pdfParse(buf);
    const text = cleanText(res?.text ?? '');

    if (!text) {
        console.warn(`[pdf] No extractable text from ${path}. If this is a scanned PDF, OCR it first.`);
    }
    return text;
}
