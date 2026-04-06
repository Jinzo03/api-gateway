import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { RedisStore} from 'rate-limit-redis'
import jwt from 'jsonwebtoken';

// 1. Load the variables from the .env file
dotenv.config();

const app = express();
const PORT = 3000;
const TARGET_API = 'https://jsonplaceholder.typicode.com';

// 2. Initialize the Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { family: 4, tls: true },
    pingInterval: 1000,
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('🟢 Successfully connected to Upstash Redis!'));

// We removed the "await" here. Now, if it fails to connect, it won't crash our whole server!
redisClient.connect().catch(() => console.log('⚠️ Redis failed to connect. Bypassing cache.'));

// 3. The Cache Check Middleware
const checkCache = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Graceful Degradation: If Redis is crashing/down, skip caching and go to proxy
    if (!redisClient.isReady) {
        return next();
    }

    try {
        const cacheKey = req.originalUrl;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log(`🟢 CACHE HIT: Served from Redis -> ${cacheKey}`);
            res.setHeader('X-Cache', 'HIT'); // Professional touch: Tell the client it was cached
            res.json(JSON.parse(cachedData));
            return; // Stop the request here! It never hits the backend API.
        }
        
        console.log(`🔴 CACHE MISS: Fetching from backend -> ${cacheKey}`);
        next();
    } catch (error) {
        console.error('Cache check error:', error);
        next(); // If the cache errors out, just fetch the data normally
    }
};

// Authentication Middleware
const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 1. Look for "Autherization" header
    const authHeader = req.headers['authorization'];

    // 2. The standard format is "Bearer <token>", so we split the string to just get the token
    const token = authHeader && authHeader.split(' ')[1];

    // 3. If there is no token at all, reject them immediately
    if (!token) {
        res.status(401).json({ error: ' Access Denied: No VIP wristband (token) provided!' });
        return;
    }

    // 4. If they have a toke, check if it was signed by the secret
    try {
        // If this fails, it throws an error and jumps to the catch block
        jwt.verify(token, process.env.JWT_SECRET as string);

        console.log('Token valid! Letting user through.');
        next(); // Send them to the rate limiter!
    } catch (error) {
        res.status(403).json({ error: 'Access Denied: Fake or expired wristband'})
    }
};

// 4. The Proxy Middleware with Response Interceptor
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5, // Limit each IP to 5 requests per minute
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    store: new RedisStore({
        // The Redis client needs to be passed in a specific way for the store adapter
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    // The JSON message sent to the user when they get blockeed
    message: { error: 'Whoa there! Too many requests. Please try again in a minute.' },
    // Add this handler to log the blocks!
    handler: (req, res, next, options) => {
        console.log(`BLOCKED: Rate limit exceeded for IP -> ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// A mock login route to generate a token
app.get('/login', (req, res) => {
    const mockUser = { id: 777, username: 'iyedd', role: 'admin' };

    // Create the token, sign it with the secret , and make it expire in 1 hour
    const token = jwt.sign(mockUser, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    
    res.json({
        message: "Here is your VIP wristband",
        token: token
    });
});

app.use('/api', verifyToken, apiLimiter, checkCache, createProxyMiddleware({
    target: TARGET_API,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    selfHandleResponse: true, // Required to intercept the response
    on: {
        // Intercept the data coming back from JSONPlaceholder
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
            const data = responseBuffer.toString('utf8');
            
            // Only try to save if Redis is actually connected and the request was successful
            if (redisClient.isReady && res.statusCode === 200) {
                try {
                    // Save the data to Redis for 60 seconds
                    await redisClient.setEx(req.originalUrl, 60, data);
                    res.setHeader('X-Cache', 'MISS');
                } catch (error) {
                    console.error('Cache save error:', error);
                }
            }
            return responseBuffer; // Send the data to the user
        })
    },
    logger: console
}));

// 5. Start the server
app.listen(PORT, () => {
    console.log(` API Gateway is live on http://localhost:${PORT}`);
    console.log(` Proxying /api requests to ${TARGET_API}`);
});