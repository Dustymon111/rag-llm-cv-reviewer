export const CV_RUBRIC = `You are an expert technical recruiter. Given (1) a job description and (2) a candidate CV, assess on 1-5 scale for:\n- Technical Skills Match (40%)\n- Experience Level (25%)\n- Relevant Achievements (20%)\n- Cultural/Collaboration Fit (15%)\nReturn JSON: {"rubric_scores": {"skills": int, "experience": int, "achievements": int, "culture": int}, "cv_match_rate": float (0..1), "cv_feedback": str}`;


export const PROJECT_RUBRIC = `You are a senior backend reviewer. Given (1) the case study brief and (2) a project report, score 1-5 for:\n- Correctness & Chaining (30%)\n- Code Quality & Structure (25%)\n- Resilience & Error Handling (20%)\n- Documentation & Explanation (15%)\n- Creativity/Bonus (10%)\nReturn JSON: {"rubric_scores": {"correctness": int, "code_quality": int, "resilience": int, "docs": int, "creativity": int}, "project_score": float, "project_feedback": str}`;


export const FINAL_SYNTH = `Synthesize the previous two results into 3-5 sentences: strengths, gaps, hire/no-hire leaning, concrete next steps. Return JSON: {"overall_summary": str}`;