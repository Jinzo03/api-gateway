import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

export const redisClient = REDIS_URL
    ? createClient({
        url: REDIS_URL,
        socket: {
            ...(REDIS_URL.startsWith('rediss://') ? { tls: true } : {}),
            reconnectStrategy: (retries) => {
                if (retries >= 3) {
                    console.warn('Redis reconnect limit reached. Caching disabled for this session.');
                    return false;
                }

                return Math.min(retries * 200, 1000);
            }
        }
    })
    : null;

let redisInitialized = false;

export const initializeRedis = async () => {
    if (!redisClient) {
        console.warn('REDIS_URL is not set. Starting without cache.');
        return;
    }

    if (redisInitialized || redisClient.isOpen) {
        return;
    }

    redisInitialized = true;

    redisClient.on('error', (err) => console.error('Redis client error:', err.message || err));
    redisClient.on('connect', () => console.log('Connected to Redis cache.'));

    try {
        await redisClient.connect();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Redis failed to connect. Bypassing cache. ${message}`.trim());
    }
};
