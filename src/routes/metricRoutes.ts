import { Router } from 'express';

import { redisClient } from '../config/redis.js';

export const metricRoutes = Router();

metricRoutes.get('/metrics', async (req, res) => {
    if (!redisClient?.isReady) {
        res.status(503).json({ error: 'Metrics unavailable because Redis is disconnected.' });
        return;
    }

    const rawMetrics = await redisClient.hGetAll('api_metrics');
    const totalRequests = parseInt(rawMetrics.total_requests || '0', 10);
    const totalDuration = parseInt(rawMetrics.total_duration_ms || '0', 10);
    const averageTime = totalRequests > 0 ? (totalDuration / totalRequests).toFixed(2) : '0';

    res.json({
        ...rawMetrics,
        average_response_time_ms: `${averageTime}ms`
    });
});
