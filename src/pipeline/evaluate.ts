import { search } from './retrieval.js';
import { pdfText, extractCvSections, extractProjectSections } from './parsers.js';
import { CV_RUBRIC, PROJECT_RUBRIC, FINAL_SYNTH } from './prompt.ts';
import { weightedCvScore, weightedProjectScore } from './scoring.js';
import { chat } from '../llm/client.js';
import { safeJson } from '../utils/json.js';


export async function runPipeline(jobTitle: string, cvPath: string, reportPath: string) {
    const cvTxt = await pdfText(cvPath);
    const rpTxt = await pdfText(reportPath);
    const cv = extractCvSections(cvTxt);
    const pr = extractProjectSections(rpTxt);


    const jdHits = await search(`Job description for ${jobTitle} and similar backend roles`);
    const briefHits = await search('Case Study Brief and evaluation rubric for project deliverable');
    const jdCtx = jdHits.map(h => h.text).join('\n\n');
    const briefCtx = briefHits.map(h => h.text).join('\n\n');


    // CV evaluation
    const cvMsg = [
        { role: 'system' as const, content: CV_RUBRIC },
        { role: 'user' as const, content: `JOB DESCRIPTION:\n${jdCtx}\n\nCANDIDATE CV (parsed):\n${JSON.stringify(cv).slice(0, 6000)}` }
    ];
    const cvRaw = await chat(cvMsg, 0.1);
    const cvJson = safeJson<any>(cvRaw);
    const cvScores = cvJson.rubric_scores || { skills: 0, experience: 0, achievements: 0, culture: 0 };
    const cvMatch_1_5 = weightedCvScore(cvScores);
    const cvMatchRate = Math.round((cvMatch_1_5 / 5) * 100) / 100;


    // Project evaluation
    const prMsg = [
        { role: 'system' as const, content: PROJECT_RUBRIC },
        { role: 'user' as const, content: `CASE STUDY BRIEF & RUBRIC:\n${briefCtx}\n\nPROJECT REPORT (parsed):\n${JSON.stringify(pr).slice(0, 6000)}` }
    ];
    const prRaw = await chat(prMsg, 0.1);
    const prJson = safeJson<any>(prRaw);
    const prScores = prJson.rubric_scores || { correctness: 0, code_quality: 0, resilience: 0, docs: 0, creativity: 0 };
    const projectScore = Math.round(weightedProjectScore(prScores) * 100) / 100;


    // Final synthesis
    const finalRaw = await chat([
        { role: 'system' as const, content: FINAL_SYNTH },
        {
            role: 'user' as const, content: JSON.stringify({
                cv: { cv_match_rate: cvMatchRate, cv_feedback: cvJson.cv_feedback || '' },
                project: { project_score: projectScore, project_feedback: prJson.project_feedback || '' }
            })
        }
    ], 0.2);
    let overallSummary = finalRaw;
    try { overallSummary = safeJson<any>(finalRaw).overall_summary || finalRaw } catch { }


    return {
        result: {
            cv_match_rate: cvMatchRate,
            cv_feedback: cvJson.cv_feedback || '',
            project_score: projectScore,
            project_feedback: prJson.project_feedback || '',
            overall_summary: overallSummary
        },
        debug: { cvRaw, prRaw, finalRaw }
    };
}