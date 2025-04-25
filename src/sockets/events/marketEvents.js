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
    const result = await marketDataService.getCryptoDetailWithKlines(socket, data);
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

  socket.on("getCryptoDetailWithHistory", (data) => {
    handleCryptoDetailWithHistory(socket, data);
  });

  socket.on("getConversionData", (data) => {
    handleConversionData(socket, data);
  });

  socket.on("getLiveDataWithPreferences", (data) => {
    handleLiveDataWithPreferences(socket, data);
  });
};

export default marketEvents;
