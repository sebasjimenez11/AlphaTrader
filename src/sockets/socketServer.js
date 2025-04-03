// src/sockets/socketServer.js
import { Server as SocketIOServer } from "socket.io";
import marketEvents from "./events/marketEvents.js";
import unifiedMarketDataService from "../services/marketDataService.js"; // Servicio unificado

class SocketServer {
  constructor(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });
  }

  init() {
    this.io.on("connection", async (socket) => {
      console.log(`Cliente conectado: ${socket.id}`);

      // Envía la data "stocked" al cliente cuando se conecta
      await this.sendStockedData(socket);

      // Registra los eventos específicos del mercado
      marketEvents(socket, this.io);

      socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
      });

      socket.on("error", (error) => {
        console.error("Error de conexión:", error);
      });
    });
  }

  // Método para obtener y enviar la data "stocked"
  async sendStockedData(socket) {
    try {
      // Supongamos que unifiedMarketDataService tiene un método para obtener
      // data "stocked" (por ejemplo, un listado inicial de coins o data histórica)
      const stockedData = await unifiedMarketDataService.getStockedData();
      socket.emit("stockedData", stockedData);
    } catch (error) {
      console.error("Error obteniendo stocked data:", error.message);
      socket.emit("error", { message: error.message });
    }
  }

  // Método para emitir eventos a todos los clientes conectados
  emit(event, data) {
    this.io.emit(event, data);
  }
}

export default SocketServer;
