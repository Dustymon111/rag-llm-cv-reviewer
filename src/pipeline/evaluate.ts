import { search } from './retrieval.js';
import { pdfText, extractCvSections, extractProjectSections } from './parsers.js';
import { CV_RUBRIC, PROJECT_RUBRIC, FINAL_SYNTH } from './prompt.ts';
import { weightedCvScore, weightedProjectScore } from './scoring.js';
import { chat } from '../llm/client.js';
import { safeJson } from '../utils/json.js';

/** keep all filenames here so it’s easy to change */
const SOURCES = {
    JD: 'job_descriptions.pdf',
    BRIEF: 'case_study_brief.pdf',
    CV_RUBRIC: 'cv_scoring_rubric.pdf',
    PROJ_RUBRIC: 'project_scoring_rubric.pdf',
} as const;

// tiny helpers
function pickBySource<T extends { source: string }>(hits: T[], source: string, k = 3): T[] {
    return hits.filter(h => h.source === source).slice(0, k);
}
function joinTexts(hits: Array<{ text: string }>, sep = '\n\n---\n\n'): string {
    return hits.map(h => h.text).join(sep);
}

export async function runPipeline(jobTitle: string, cvPath: string, reportPath: string) {
    // Parse PDFs
    const cvTxt = await pdfText(cvPath);
    const rpTxt = await pdfText(reportPath);
    const cv = extractCvSections(cvTxt);
    const pr = extractProjectSections(rpTxt);

    const q1 = await search(`Job description for ${jobTitle} backend responsibilities skills requirements`, 10);
    const q2 = await search(`case study brief evaluation requirements scoring`, 10);
    const q3 = await search(`cv scoring rubric parameters weights guide`, 10);
    const q4 = await search(`project scoring rubric parameters weights guide`, 10);

    const jdHits = pickBySource(q1, SOURCES.JD, 6);
    const briefHits = pickBySource(q2, SOURCES.BRIEF, 6);
    const cvRubric = pickBySource(q3, SOURCES.CV_RUBRIC, 2);
    const projRubric = pickBySource(q4, SOURCES.PROJ_RUBRIC, 2);

    // fallback if a query didn’t catch the file
    if (jdHits.length === 0) {
        const alt = await search(`job description ${jobTitle} core requirements`, 10);
        jdHits.push(...pickBySource(alt, SOURCES.JD, 6));
    }
    if (briefHits.length === 0) {
        const alt = await search(`case study brief scoring guidelines`, 10);
        briefHits.push(...pickBySource(alt, SOURCES.BRIEF, 6));
    }
    if (cvRubric.length === 0) {
        const alt = await search(`cv rubric`, 10);
        cvRubric.push(...pickBySource(alt, SOURCES.CV_RUBRIC, 2));
    }
    if (projRubric.length === 0) {
        const alt = await search(`project rubric`, 10);
        projRubric.push(...pickBySource(alt, SOURCES.PROJ_RUBRIC, 2));
    }

    const jdCtx = joinTexts(jdHits);
    const briefCtx = joinTexts(briefHits);
    const cvRubricCtx = joinTexts(cvRubric);
    const projRubricCtx = joinTexts(projRubric);

    // CV evaluation — JD as factual ground truth, CV rubric to guide scoring
    const cvMsg = [
        { role: 'system' as const, content: CV_RUBRIC },
        {
            role: 'user' as const,
            content:
                `JOB TITLE: ${jobTitle}\n\n` +
                `JOB DESCRIPTION CONTEXT:\n${jdCtx}\n\n` +
                `CV SCORING RUBRIC (context for HOW to score):\n${cvRubricCtx}\n\n` +
                `CANDIDATE CV (parsed JSON):\n${JSON.stringify(cv).slice(0, 6000)}`
        }
    ];
    const cvRaw = await chat(cvMsg, 0.2);
    const cvJson = safeJson<any>(cvRaw);
    const cvScores = cvJson.rubric_scores || { skills: 0, experience: 0, achievements: 0, culture: 0 };
    const cvMatch_1_5 = weightedCvScore(cvScores);
    const cvMatchRate = Math.round((cvMatch_1_5 / 5) * 100) / 100; // changed into 0 - 1 scoring

    // Project evaluation — Brief as factual ground truth, Project rubric to guide scoring
    const prMsg = [
        { role: 'system' as const, content: PROJECT_RUBRIC },
        {
            role: 'user' as const,
            content:
                `CASE STUDY BRIEF (ground truth for deliverable):\n${briefCtx}\n\n` +
                `PROJECT SCORING RUBRIC (context for HOW to score):\n${projRubricCtx}\n\n` +
                `PROJECT REPORT (parsed JSON):\n${JSON.stringify(pr).slice(0, 6000)}`
        }
    ];
    const prRaw = await chat(prMsg, 0.1);
    const prJson = safeJson<any>(prRaw);
    const prScores = prJson.rubric_scores || { correctness: 0, code_quality: 0, resilience: 0, docs: 0, creativity: 0 };
    const projectScore = Math.round(weightedProjectScore(prScores) * 100) / 100; // still using 1 - 5 scoring

    // Final synthesis
    const finalRaw = await chat([
        { role: 'system' as const, content: FINAL_SYNTH },
        {
            role: 'user' as const,
            content: JSON.stringify({
                cv: {
                    cv_match_rate: cvMatchRate,
                    cv_feedback: cvJson.cv_feedback || ''
                },
                project: {
                    project_score: projectScore,
                    project_feedback: prJson.project_feedback || ''
                }
            })
        }
    ], 0.2);

    let overallSummary = finalRaw;
    try { overallSummary = safeJson<any>(finalRaw).overall_summary || finalRaw; } catch { /* leave as-is */ }

    return {
        result: {
            cv_match_rate: cvMatchRate,
            cv_feedback: cvJson.cv_feedback || '',
            project_score: projectScore,
            project_feedback: prJson.project_feedback || '',
            overall_summary: overallSummary
        },
        // keep raw for debugging while tuning prompts
        debug: {
            cvRaw, prRaw, finalRaw,
            sources_used: {
                jd: jdHits.map(h => h.source),
                brief: briefHits.map(h => h.source),
                cv_rubric: cvRubric.map(h => h.source),
                proj_rubric: projRubric.map(h => h.source),
            }
        }
    };
}
