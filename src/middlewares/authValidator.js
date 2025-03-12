import { body, validationResult } from "express-validator";

export const loginValidator = [
  body("Email")
    .isEmail()
    .withMessage("El correo electrónico no es válido")
    .normalizeEmail(),
  body("Password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        codeStatus: 400,
        status: false,
        errors: errors.array(),
      });
    }
    next();
  },
];
