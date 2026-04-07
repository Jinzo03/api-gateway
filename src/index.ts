import dotenv from 'dotenv';
import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import { initializeRedis, redisClient } from './config/redis.js';
import { verifyToken } from './middlewares/auth.js';
import { checkCache } from './middlewares/cache.js';
import { createApiLimiter } from './middlewares/rateLimiter.js';
import { telemetry } from './middlewares/telemetry.js';
import { authRoutes } from './routes/authRoutes.js';
import { metricRoutes } from './routes/metricRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BACKEND_SERVERS = [
    'https://jsonplaceholder.typicode.com',
    'https://jsonplaceholder.typicode.com',
    'https://jsonplaceholder.typicode.com'
];

let currentServerIndex = 0;

const bootstrap = async () => {
    await initializeRedis();

    const apiLimiter = createApiLimiter();

    app.use(authRoutes);
    app.use(metricRoutes);

    app.use('/api', telemetry, verifyToken, apiLimiter, checkCache, createProxyMiddleware({
        target: BACKEND_SERVERS[0],
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
        router: () => {
            const target = BACKEND_SERVERS[currentServerIndex];

            console.log(`LOAD BALANCER: Routing request to server ${currentServerIndex + 1}`);
            currentServerIndex = (currentServerIndex + 1) % BACKEND_SERVERS.length;

            return target;
        },
        selfHandleResponse: true,
        on: {
            proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
                const data = responseBuffer.toString('utf8');

                if (redisClient?.isReady && res.statusCode === 200) {
                    try {
                        await redisClient.setEx(req.originalUrl, 60, data);
                        res.setHeader('X-Cache', 'MISS');
                    } catch (error) {
                        console.error('Cache save error:', error);
                    }
                }

                return responseBuffer;
            })
        },
        logger: console
    }));

    app.listen(PORT, () => {
        console.log(`API Gateway is live on http://localhost:${PORT}`);
        console.log(`Proxying /api requests to ${BACKEND_SERVERS.join(', ')}`);
    });
};

void bootstrap();
