export function safeJson<T = any>(s: string): T {
    try { return JSON.parse(s) } catch {
        // naive fix: extract first {...} block
        const start = s.indexOf('{'); const end = s.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(s.slice(start, end + 1));
        }
        throw new Error('Invalid JSON from LLM');
    }
}