import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';

const provider = process.env.LLM_PROVIDER || 'groq';


export async function chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], temperature = 0.2) {
    if (provider === 'groq') {
        const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: process.env.GROQ_BASE_URL });
        const res: ChatCompletion = await client.chat.completions.create({
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            temperature,
            response_format: { type: 'json_object' },
            messages
        });

        const content = res.choices?.[0]?.message?.content;
        if (!content) throw new Error('LLM returned no content');
        return content
    }

    // if (provider === 'gemini') {
    //     const key = process.env.GEMINI_API_KEY!;
    //     const model = process.env.GEMINI_MODEL || 'models/gemini-2.0-flash';
    //     const history = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    //     const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ contents: history, generationConfig: { temperature } })
    //     });
    //     const data = await r.json();
    //     return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // }
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}