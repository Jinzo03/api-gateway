import { Router } from 'express';
import jwt from 'jsonwebtoken';

export const authRoutes = Router();

authRoutes.get('/login', (req, res) => {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        res.status(500).json({ error: 'JWT_SECRET is not configured.' });
        return;
    }

    const mockUser = { id: 777, username: 'iyedd', role: 'admin' };
    const token = jwt.sign(mockUser, jwtSecret, { expiresIn: '1h' });

    res.json({
        message: 'Here is your VIP wristband',
        token
    });
});
