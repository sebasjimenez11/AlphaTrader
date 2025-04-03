// src/controllers/AuthController.js
class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async login(req, res, next) {
    const result = await this.authService.login(req.body);
    // Se asume que la respuesta exitosa siempre es 200 (o 201 según el caso)
    res.status(200).json({ status: true, ...result });
  }

  async oauthCallback(req, res, next) {
    // Passport coloca el usuario autenticado en req.user
    const result = await this.authService.findOrCreateByOAuth(req.user);
    res.status(200).json({ status: true, ...result });
  }
}

export default AuthController;
