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

  emitErrorToAll(message) {
    this.io.emit("serverError", { message });
  }
}
