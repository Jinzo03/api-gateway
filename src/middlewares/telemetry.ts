import type { NextFunction, Request, Response } from 'express';

import { redisClient } from '../config/redis.js';

export const telemetry = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', async () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        console.log(`TELEMETRY: ${req.method} ${req.originalUrl} | Status: ${status} | Time: ${duration}ms`);

        if (!redisClient?.isReady) {
            return;
        }

        try {
            await redisClient.hIncrBy('api_metrics', 'total_requests', 1);
            await redisClient.hIncrBy('api_metrics', `status_${status}`, 1);
            await redisClient.hIncrBy('api_metrics', 'total_duration_ms', duration);
        } catch (error) {
            console.error('Telemetry save error:', error);
        }
    });

    next();
};
