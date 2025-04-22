import crypto from "crypto";


const TOKEN_EXPIRATION_MINUTES = 60; 

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-') // Reemplaza + con -
    .replace(/\//g, '_') // Reemplaza / con _
    .replace(/=/g, '');  // Elimina el padding =
}

/**
 * Genera un token de recuperación de contraseña aleatorio y calcula su fecha de expiración.
 *
 * @returns {{ token: string, expiresAt: Date }} Un objeto con el token y su fecha de expiración.
 */
const generateTokenRecovery = () => {
    const tokenBytes = crypto.randomBytes(32);
    const token = base64url(tokenBytes);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);
    return { token, expiresAt };
}

export default generateTokenRecovery;