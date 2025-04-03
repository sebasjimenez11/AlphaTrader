// src/sockets/events/marketEvents.js
import marketDataService from "../../services/marketDataService.js";

const handleMainCoinsLiveData = async (socket, data) => {
  try {
    const result = await marketDataService.getMainCoinsLiveData();
    // En este caso, result contiene: { mainCoins, lastUpdate, ws }
    socket.emit("mainCoinsLiveData", result);
  } catch (error) {
    console.error("Error en getMainCoinsLiveData:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const handleSecondaryCoinsLiveData = async (socket, data) => {
  try {
    const result = await marketDataService.getSecondaryCoinsLiveData();
    socket.emit("secondaryCoinsLiveData", result);
  } catch (error) {
    console.error("Error en getSecondaryCoinsLiveData:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const handleCryptoDetailWithHistory = async (socket, data) => {
  try {
    const { cryptoId, interval, historyRange } = data;
    const result = await marketDataService.getCryptoDetailWithHistory(cryptoId, { interval, historyRange });
    socket.emit("cryptoDetailWithHistory", result);
  } catch (error) {
    console.error("Error en getCryptoDetailWithHistory:", error.message);
    socket.emit("error", { message: error.message });
  }
};

const handleConversionData = async (socket, data) => {
  try {
    const { cryptoId, fiatCurrency, amountCrypto } = data;
    const result = await marketDataService.getConversionData(cryptoId, fiatCurrency, amountCrypto);
    socket.emit("conversionData", result);
  } catch (error) {
    console.error("Error en getConversionData:", error.message);
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

  socket.on("getCryptoDetailWithHistory", (data) => {
    handleCryptoDetailWithHistory(socket, data);
  });

  socket.on("getConversionData", (data) => {
    handleConversionData(socket, data);
  });
};

export default marketEvents;
