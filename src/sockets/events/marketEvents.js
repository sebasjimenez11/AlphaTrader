import marketDataService from "../../services/marketDataService.js";

const handleMainCoinsLiveData = async (socket, data) => {
  try {
    const result = await marketDataService.getMainCoinsLiveData(socket);
    socket.emit("mainCoinsLiveData", result);
  } catch (error) {
    console.error("Error en getMainCoinsLiveData:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const handleSecondaryCoinsLiveData = async (socket, data) => {
  try {
    const result = await marketDataService.getSecondaryCoinsLiveData(socket);
  } catch (error) {
    console.error("Error en getSecondaryCoinsLiveData:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const handleCryptoDetailWithHistory = async (socket, data) => {
  try {
    await marketDataService.getCryptoDetailWithKlines(socket, data);
  } catch (error) {
    console.error("Error en getCryptoDetailWithHistory:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const coinDetailWithHistoryRange = async (socket, data) => {
  try {
    await marketDataService.getShortTermHistoryWithLiveUpdates(socket, data);
  } catch (error) {
    console.error(`[${socket.id}] Error procesando getShortTermHistory:`, error.message);
  }
}

const handleCoinDetailPreferences = async (socket, data) => {
  try {
    await marketDataService.getCoinDetailPreferences(socket, data);
  } catch (error) {
    console.error(`[${socket.id}] Error procesando getCoinDetailPreferences:`, error.message);
  }
};

const handleLiveDataWithPreferences = async (socket, data) => {
  try {
    const idUser = socket.tokenId;
    const result = await marketDataService.getLiveDataWithPreferences(idUser, socket);
    socket.emit("dataWithPreferences", result);
  } catch (error) {
    console.error("Error en getLiveDataWithPreferences:", error.message);
    socket.emit("error", { message: error.message });
  }
};


const marketEvents = (socket, io) => {
  socket.on("getMainCoinsLiveData", (data) => {
    handleMainCoinsLiveData(socket, data);
  });

  socket.on("getSecondaryCoinsLiveData", (data) => {
    handleSecondaryCoinsLiveData(socket, data);
  });

 socket.on("getCryptoDetailWithHistory", (data) => { // <-- Evento que escucha del cliente
    handleCryptoDetailWithHistory(socket, data); // <-- Llama al handler de arriba
  });

   socket.on("getCoinDetailPreferences", (data) => {
     handleCoinDetailPreferences(socket, data);
  });

// metodo para ontener la data de la tabla de la moneda con los klines de los ultimos 30 dias
  socket.on("getShortTermHistory", (data) => {
    coinDetailWithHistoryRange(socket, data); // Llama al handler correspondiente
  });

  socket.on("getLiveDataWithPreferences", (data) => {
    handleLiveDataWithPreferences(socket, data);
  });
};

export default marketEvents;
