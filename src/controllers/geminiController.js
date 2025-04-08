class GeminiController {
    constructor(geminiService) {
      this.geminiService = geminiService;
    }
  
    async chat(req, res, next) {
      try {
        const { mensaje } = req.body;
        if (!mensaje) {
          return res.status(400).json({ error: 'El campo "mensaje" es requerido.' });
        }
  
        const respuesta = await this.geminiService.llamarGemini(mensaje);
        res.json({ status: true, respuesta });
      } catch (error) {
        next(error);
      }
    }
  }
  
  export default GeminiController;
  