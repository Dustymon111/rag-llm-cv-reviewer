// Types
type CvScores = {
    skills: number;
    experience: number;
    achievements: number;
    culture: number;
};

type ProjectScores = {
    correctness: number;
    code_quality: number;
    resilience: number;
    docs: number;
    creativity: number;
};

// Assertions
function assertCvScores(s: any): asserts s is CvScores {
    const keys: (keyof CvScores)[] = ['skills', 'experience', 'achievements', 'culture'];
    for (const k of keys) {
        if (typeof s?.[k] !== 'number') throw new Error(`CV score "${k}" missing or not a number`);
    }
}

function assertProjectScores(s: any): asserts s is ProjectScores {
    const keys: (keyof ProjectScores)[] = ['correctness', 'code_quality', 'resilience', 'docs', 'creativity'];
    for (const k of keys) {
        if (typeof s?.[k] !== 'number') throw new Error(`Project score "${k}" missing or not a number`);
    }
}

// Weight Calculations
export function weightedCvScore(s: unknown): number {
    assertCvScores(s);
    const w = { skills: 0.4, experience: 0.25, achievements: 0.2, culture: 0.15 } as const;
    return s.skills * w.skills +
        s.experience * w.experience +
        s.achievements * w.achievements +
        s.culture * w.culture;
}

export function weightedProjectScore(s: unknown): number {
    assertProjectScores(s);
    const w = { correctness: 0.3, code_quality: 0.25, resilience: 0.2, docs: 0.15, creativity: 0.1 } as const;
    return s.correctness * w.correctness +
        s.code_quality * w.code_quality +
        s.resilience * w.resilience +
        s.docs * w.docs +
        s.creativity * w.creativity;
}