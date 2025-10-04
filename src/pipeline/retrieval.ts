// Simple local vector store with SQLite + cosine similarity
import { pipeline } from '@xenova/transformers';
import { db } from '../db/client.js';
import { vectors } from '../db/schema.js';
import { eq } from 'drizzle-orm';


type VectorRow = {
    id: number;
    docId: string;
    source: string;
    embedding: string; // JSON stringified numbers
    text: string;
};

let embedder: any;
async function getEmbedder() {
    if (!embedder) embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return embedder;
}


export async function embed(texts: string[]): Promise<number[][]> {
    const model = await getEmbedder();
    const embs = [] as number[][];
    for (const t of texts) {
        const out = await model(t, { pooling: 'mean', normalize: true });
        embs.push(Array.from(out.data as Float32Array));
    }
    return embs;
}


export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
    if (!a || !b) throw new Error('cosine(): a/b required');
    if (a.length !== b.length) throw new Error(`cosine(): length mismatch a=${a.length} b=${b.length}`);
    if (a.length === 0) return 0;

    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i];
        const bi = b[i];
        if (ai === undefined || bi === undefined) {
            throw new Error(`cosine(): undefined at index ${i}`);
        }
        dot += ai * bi;
        na += ai * ai;
        nb += bi * bi;
    }

    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}



export async function ingestDocs(docs: { id: string, source: string, text: string }[]) {
    if (!docs.length) {
        console.warn('[ingest] nothing to insert');
        return;
    }

    const embs = await embed(docs.map(d => d.text));
    const insert = db.insert(vectors).values(docs.map((d, i) => ({
        docId: d.id,
        source: d.source,
        embedding: JSON.stringify(embs[i]),
        text: d.text
    })));
    await insert;
}


export async function search(query: string, k = 6) {
    // 1) Embed the query
    const embs = await embed([query]);
    const qemb = embs[0];
    if (!qemb) {
        // If embed failed, either throw or return empty
        throw new Error('Embedding failed for query');
        // return [];
    }

    // 2) Load all rows (or page them if large)
    const rows = await db.select().from(vectors) as VectorRow[];

    // 3) Score with guards
    const scored = rows.flatMap((r) => {
        // parse stored embedding
        const vec = JSON.parse(r.embedding) as number[]; // or Float32Array if you stored typed arrays
        // length guard to satisfy cosine() and avoid runtime errors
        if (vec.length !== qemb.length) {
            return []; // skip mismatched vectors (or re-embed your corpus consistently)
        }
        const score = cosine(qemb, vec);
        return [{ text: r.text, source: r.source, score }];
    });

    // 4) Rank + take top-k
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
}