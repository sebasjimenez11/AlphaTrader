// test/socketClientTest.js
import { io } from "socket.io-client";

// const socket = io("https://alphatraderback-esenfrgzcnbfbufw.brazilsouth-01.azurewebsites.net", {
//   reconnectionAttempts: 5, // Número de intentos de reconexión
//   timeout: 20000, // Tiempo de espera antes de considerar que la conexión ha fallado
// });
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxYTc4YWQ5LTg3MWItNDVhMC1iMjNiLTAzNWVjZmFhODIwNiIsImVtYWlsIjoic2ViYXNqaW1lbmV6MTEyMUBnbWFpbC5jb20iLCJjb21wbGV0ZWRQZXJmaWwiOnRydWUsImlhdCI6MTc0NTU3MTg5NiwiZXhwIjoxNzQ1NTc1NDk2fQ.5QTlkD8Fj0LayOXkCq6HbVuZo9MLPt82shRgYMujWIE";
const socket = io("http://localhost:10101", {
  auth: {
    token: `bearer ${token}`
  }
});

socket.on("connect", () => {
  console.log("Conectado al servidor con ID:", socket.id);

  // Solicitar principales criptomonedas en vivo
  // socket.emit("getMainCoinsLiveData");

  // socket.emit("getLiveDataWithPreferences");

  // Solicitar monedas secundarias en vivo
  // socket.emit("getSecondaryCoinsLiveData");

  // Solicitar detalle de una crypto con historial
  // socket.emit("getCryptoDetailWithHistory", { cryptoId: "bitcoin", interval: "1d", historyRange: "30d" });

  // Solicitar datos de conversión
  // socket.emit("getConversionData", { cryptoId: "bitcoin", fiatCurrency: "USD", amountCrypto: 1 });
});

// 1. MainCoinsData
socket.on("mainCoinsData", (data) => {
  console.log("Data principales en vivo:", data);
});

socket.on("mainCoinUpdate", (data) => {
  console.log("Datos de conversión 1:", data);
});


// 2. SecondaryCoinsData
socket.on("secondaryCoinsData", (data) => {
  console.log("Data secundarias en vivo:", data);
});

socket.on("secondaryCoinUpdate", (data) => {
  console.log("Datos de conversión 2:", data);
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

socket.on("preferencesData", (data) => {
  console.log("Datos de preferencias:", data);
});

socket.on("preferenceUpdate", (data) => {
  console.log("Datos de preferencias:", data);
});

socket.on("disconnect", () => {
  console.log("Desconectado del servidor");
});
