class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async login(req, res) {
    const response = await this.authService.login(req.body);
    res.status(response.codeStatus).json(response);
  }

  async oauthCallback(req, res) {
    // Aquí se asume que passport ya colocó el usuario en req.user
    try {
    
    const response = await this.authService.findOrCreateByOAuth(req.user);
    res.status(response.codeStatus).json(response);
      
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default AuthController;
