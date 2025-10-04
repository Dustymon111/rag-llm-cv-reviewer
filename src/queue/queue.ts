import { Queue, type JobsOptions } from 'bullmq';

export const connection = { url: process.env.REDIS_URL! };
export const evalQueue = new Queue('eval', { connection });

export async function enqueueEval(jobId: number) {
    const opts: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 2000 } };
    return evalQueue.add('evaluate', { jobId }, opts);
}