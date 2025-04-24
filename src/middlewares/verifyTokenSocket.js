import jwt from 'jsonwebtoken';

const verifySocketToken = (socket, next) => {
  const token = socket.handshake.auth.token.split(' ')[1];

  if (!token) {
    return next(new Error('Token no proporcionado o inválido'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.tokenId = decoded.id;
    socket.tokenEmail = decoded.email;
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    next(new Error('Token inválido o expirado'));
  }
};

export default verifySocketToken;
