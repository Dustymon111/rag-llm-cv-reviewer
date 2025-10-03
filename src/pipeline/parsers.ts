import { readPdfText } from './pdf.js';

export async function pdfText(path: string) {
    return readPdfText(path);
}


export function extractCvSections(text: string) {
    const lower = text.toLowerCase();
    const find = (key: string) => {
        const idx = lower.indexOf(key);
        if (idx === -1) return '';
        return text.slice(idx, idx + 1500);
    };
    return {
        years_exp: null,
        skills: find('skills'),
        experience: find('experience'),
        education: find('education'),
        full_text: text
    };
}


export function extractProjectSections(text: string) {
    return { overview: text.slice(0, 1500), details: text };
}