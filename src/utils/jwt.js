// utils/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const generateToken = (user) => {
    // Ajusta a los campos que quieras incluir en el payload
    const payload = {
        id: user.ID,
        email: user.Email,
        completedPerfil: user.Status,
    };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
};
