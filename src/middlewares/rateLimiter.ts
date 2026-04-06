import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { NextFunction, Request, Response } from 'express';

import { redisClient } from '../config/redis.js';

const baseLimiterConfig = {
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a minute.' },
    handler: (
        req: Request,
        res: Response,
        next: NextFunction,
        options: { statusCode: number; message: unknown }
    ) => {
        console.log(`BLOCKED: Rate limit exceeded for IP -> ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
};

const rateLimitRedisClient = redisClient;

export const apiLimiter = rateLimitRedisClient
    ? rateLimit({
        ...baseLimiterConfig,
        store: new RedisStore({
            sendCommand: (...args: string[]) => rateLimitRedisClient.sendCommand(args)
        })
    })
    : rateLimit(baseLimiterConfig);
