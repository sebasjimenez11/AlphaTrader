// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: false,
        message: err.message || 'Error interno del servidor'
    });
};

export default errorHandler;
