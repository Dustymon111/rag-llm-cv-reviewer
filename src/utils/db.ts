export function ensureOne<T>(rows: T[], msg: string): T {
    const row = rows[0];
    if (!row) throw new Error(msg);
    return row;
}

// Optional: non-throwing variant
export function takeFirst<T>(rows: T[]): T | null {
    return rows[0] ?? null;
}