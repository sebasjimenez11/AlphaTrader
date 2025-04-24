// src/sockets/socketServer.js
import { Server as SocketIOServer } from "socket.io";
import marketEvents from "./events/marketEvents.js";
import verifySocketToken from "../middlewares/verifyTokenSocket.js"; 

class SocketServer {
  constructor(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });
  }

  init() {
    this.io.use(verifySocketToken);

    this.io.on("connection", async (socket) => {
      console.log(`Cliente conectado: ${socket.id} (email: ${socket.tokenEmail})`);

      // Eventos específicos del mercado
      marketEvents(socket, this.io);

      socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
      });

      socket.on("error", (error) => {
        console.error("Error de conexión:", error);
      });
    });
  }

  emit(event, data) {
    this.io.emit(event, data);
  }
}

export default SocketServer;
