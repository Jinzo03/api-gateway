import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access denied: no bearer token provided.' });
        return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        res.status(500).json({ error: 'JWT_SECRET is not configured.' });
        return;
    }

    try {
        jwt.verify(token, jwtSecret);
        console.log('Token valid. Letting user through.');
        next();
    } catch (error) {
        res.status(403).json({ error: 'Access denied: invalid or expired token.' });
    }
};
