// src/sockets/socketServer.js
import { Server as SocketIOServer } from "socket.io";
import marketEvents from "./events/marketEvents.js";
import verifySocketToken from "../middlewares/verifyTokenSocket.js";
import marketDataService from "../services/marketDataService.js"; // Importar instancia del servicio
import cleanupSocketResources from "../utils/cleanupSocketResources.js"; // Importar utilidad

class SocketServer {
  constructor(httpServer, options = {}) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
      ...options
    });
    // No necesitamos guardar marketDataService aquí si lo importamos directamente donde se necesita
  }

  init() {
    this.io.use(verifySocketToken);

    this.io.on("connection", (socket) => {
      console.log(`[${socket.id}] Cliente conectado (email: ${socket.tokenEmail})`);

      // IMPORTANTE: Adjuntar adaptador al socket para que cleanup lo use
      // Asumiendo que MarketDataService expone su adaptador
      if (marketDataService.marketDataAdap) {
         socket.marketDataAdap = marketDataService.marketDataAdap;
      } else {
          console.error(`[${socket.id}] ¡Alerta! marketDataService.marketDataAdap no está disponible. La limpieza de listeners puede fallar.`);
      }

      // Registrar eventos de mercado
      marketEvents(socket, this.io);

      // Manejador Centralizado de Desconexión
      socket.on("disconnect", (reason) => {
        // Llamar a la utilidad externa, pasando los mapas del servicio
        cleanupSocketResources(socket, marketDataService.socketListeners, marketDataService.socketWebsockets);
      });

      // Manejador de Errores
      socket.on("error", (error) => {
        console.error(`[${socket.id}] Error de conexión socket:`, error.message);
        // Considerar si llamar a cleanup aquí también
        // cleanupSocketResources(socket, marketDataService.socketListeners, marketDataService.socketWebsockets);
      });
    });

  }

  /**
   * Cierra todas las conexiones y limpia recursos.
   */
  async closeAllConnections() {
    console.log("Iniciando cierre de conexiones Socket.IO...");
    const sockets = this.io.sockets.sockets;

    if (sockets.size === 0) {
        console.log("No hay clientes conectados.");
        return;
    }

    console.log(`Cerrando ${sockets.size} conexiones...`);
    const cleanupPromises = [];

    sockets.forEach((socket) => {
       console.log(`[${socket.id}] Limpiando y desconectando (cierre servidor)...`);
       // Adjuntar adaptador por si acaso no se hizo en la conexión (poco probable pero seguro)
       if (!socket.marketDataAdap && marketDataService.marketDataAdap) {
            socket.marketDataAdap = marketDataService.marketDataAdap;
       }
       // Llamar a la utilidad para limpiar listeners/WS externos
       cleanupPromises.push(Promise.resolve(cleanupSocketResources(socket, marketDataService.socketListeners, marketDataService.socketWebsockets)));
       // Desconectar el socket de Socket.IO
       socket.disconnect(true);
    });

    try {
        await Promise.all(cleanupPromises);
        console.log("Limpieza de recursos externos completada.");
    } catch (error) {
        console.error("Error durante limpieza masiva de recursos:", error);
    }

    // Cerrar el servidor Socket.IO
    this.io.close((err) => {
      if (err) { console.error("Error cerrando servidor Socket.IO:", err); }
      else { console.log("Servidor Socket.IO cerrado."); }
    });
  }

  // ... otros métodos (emit, etc.) ...
    emit(event, data) { this.io.emit(event, data); }
    emitErrorToAll(message) { this.io.emit("serverError", { message }); }
}

export default SocketServer;