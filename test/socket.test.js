// test/socketClientTest.js
import { io } from "socket.io-client";

const socket = io("http://localhost:10101");

socket.on("connect", () => {
  console.log("Conectado al servidor con ID:", socket.id);

  // Solicitar principales criptomonedas en vivo
  socket.emit("getMainCoinsLiveData");

  // Solicitar monedas secundarias en vivo
  // socket.emit("getSecondaryCoinsLiveData");

  // Solicitar detalle de una crypto con historial
  // socket.emit("getCryptoDetailWithHistory", { cryptoId: "bitcoin", interval: "1d", historyRange: "30d" });

  // Solicitar datos de conversión
  // socket.emit("getConversionData", { cryptoId: "bitcoin", fiatCurrency: "USD", amountCrypto: 1 });
});

socket.on("mainCoinsLiveData", (data) => {
  console.log("Data principales en vivo:", data);
});

socket.on("secondaryCoinsLiveData", (data) => {
  console.log("Data secundarias en vivo:", data);
});

socket.on("cryptoDetailWithHistory", (data) => {
  console.log("Detalle con historial:", data);
});

socket.on("conversionData", (data) => {
  console.log("Datos de conversión:", data);
});

socket.on("error", (error) => {
  console.error("Error recibido:", error);
});

socket.on("disconnect", () => {
  console.log("Desconectado del servidor");
});
