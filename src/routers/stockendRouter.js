function initStockendRouter(io) {
  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Ejemplo: Suscripción a un canal
    socket.on("subscribe", (data) => {
      const { channel } = data;
      // Validar condiciones del canal aquí si es necesario
      socket.join(channel);
      console.log(`Cliente ${socket.id} se unió al canal: ${channel}`);
      socket.emit("subscribed", { channel, message: `Te has unido al canal ${channel}` });
    });

    // Ejemplo: Desuscripción de un canal
    socket.on("unsubscribe", (data) => {
      const { channel } = data;
      socket.leave(channel);
      console.log(`Cliente ${socket.id} se salió del canal: ${channel}`);
      socket.emit("unsubscribed", { channel, message: `Te has salido del canal ${channel}` });
    });

    // Enviar un mensaje a un canal (room)
    socket.on("sendMessage", (data) => {
      const { channel, message } = data;
      // Se emite a todos los clientes en ese canal, incluido el remitente
      io.to(channel).emit("message", { channel, message, from: socket.id });
      console.log(`Mensaje enviado al canal ${channel} desde ${socket.id}: ${message}`);
    });

    // Manejo de errores
    socket.on("error", (error) => {
      console.error(`Error en el socket ${socket.id}:`, error);
    });

    // Manejo de desconexiones
    socket.on("disconnect", (reason) => {
      console.log(`Cliente desconectado: ${socket.id} - Razón: ${reason}`);
      // Aquí puedes agregar lógica adicional si necesitas limpiar recursos
    });

    // Opcional: Puedes implementar un evento para reconexión manual, 
    // aunque Socket.io en el cliente suele manejarlo automáticamente.
    socket.on("reconnect_attempt", () => {
      console.log(`Reintentando reconexión para el socket ${socket.id}`);
    });
  });
}

export default initStockendRouter;