import type { NextFunction, Request, Response } from 'express';

import { redisClient } from '../config/redis.js';

export const checkCache = async (req: Request, res: Response, next: NextFunction) => {
    if (!redisClient?.isReady) {
        next();
        return;
    }

    try {
        const cacheKey = req.originalUrl;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log(`CACHE HIT: Served from Redis -> ${cacheKey}`);
            res.setHeader('X-Cache', 'HIT');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log(`CACHE MISS: Fetching from backend -> ${cacheKey}`);
        next();
    } catch (error) {
        console.error('Cache check error:', error);
        next();
    }
};
