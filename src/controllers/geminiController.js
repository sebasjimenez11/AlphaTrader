// geminiController.js
class GeminiController {
    constructor(geminiService) {
      this.geminiService = geminiService;
    }

    async chat(req, res, next) {
      try {
        const { mensaje } = req.body;
        const idUser = req?.tokenId; 

        if (!mensaje) {
          return res.status(400).json({ error: 'El campo "mensaje" es requerido.' });
        }

        // Pasar mensaje y idUser al servicio
        const respuesta = await this.geminiService.llamarGemini(mensaje, idUser);
        res.json({ status: true, respuesta });
      } catch (error) {
        next(error);
      }
    }
  }

  export default GeminiController;