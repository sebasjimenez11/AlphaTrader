// test/socketClientTest.js
import { io } from "socket.io-client";

// ... (configuración de conexión y token) ...
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxYTc4YWQ5LTg3MWItNDVhMC1iMjNiLTAzNWVjZmFhODIwNiIsImVtYWlsIjoic2ViYXNqaW1lbmV6MTEyMUBnbWFpbC5jb20iLCJjb21wbGV0ZWRQZXJmaWwiOnRydWUsImlhdCI6MTc0NTY4MzczNSwiZXhwIjoxNzQ1Njg3MzM1fQ.nbZo655E3gcC298XXZb50xZsuswYpQRXEVW129EPtEs"; // Reemplaza con un token válido
const socket = io("http://localhost:10101", { // O tu URL de producción
  auth: {
    token: `bearer ${token}`
  }
});

socket.on("connect", () => {
  console.log("Conectado:", socket.id);

  // --- Solicitar Klines basados en Preferencias (o ID específico) ---

  // CASO 1: Sin cryptoId (usará la primera preferencia)
  // const requestPrefDataDefault = {
  //     interval: '4h', // Opcional
  //     limit: 50       // Opcional
  // };
  // console.log("Emitiendo getCoinDetailPreferences (usará primera preferencia):", requestPrefDataDefault);
  // socket.emit("getCoinDetailPreferences", requestPrefDataDefault);

  // CASO 2: Con cryptoId específico (ignora preferencias para la selección inicial)
  const requestPrefDataSpecific = {
     cryptoId: 'cardano', // ID específico
     interval: '1d',
     limit: 10
  };
  console.log("Emitiendo getCoinDetailPreferences (ID específico):", requestPrefDataSpecific);
  socket.emit("getCoinDetailPreferences", requestPrefDataSpecific);

  // CASO 3: Con cryptoId específico (ignora preferencias para la selección inicial)
  
  // socket.emit('getLiveDataWithPreferences');

});

// --- Listeners para Klines de Preferencias ---

// Recibe datos iniciales (detalles, klines, y lista de TODAS las prefs)
socket.on("preferenceKlineData", (data) => {
  console.log("+++ Datos Klines Preferencia Recibidos (preferenceKlineData) +++");
  console.log("Moneda Mostrada:", data.coinDetail?.name, `(${data.binanceSymbol})`);
  console.log("Intervalo:", data.interval);
  console.log(`Recibidos ${data.klines?.length || 0} klines históricos.`);
  console.log("TODAS las Preferencias del Usuario:", data.preferredSymbols);
  // Procesar data.klines y data.coinDetail
});

// Recibe vela cerrada para la moneda mostrada
socket.on("preferenceKlineUpdate", (closedCandle) => {
  console.log("--- Vela Preferencia Cerrada (preferenceKlineUpdate) ---");
  console.log("Moneda:", closedCandle.binanceSymbol, "Precio Cierre:", closedCandle.currentPrice);
});

// Recibe tick de la vela en formación para la moneda mostrada
socket.on("preferenceKlineTickUpdate", (tickData) => {
  console.log("--- Tick Vela Preferencia (preferenceKlineTickUpdate) ---");
   console.log("Moneda:", tickData.binanceSymbol, "Precio Actual:", tickData.currentPrice);
  console.log(tickData);

});


// --- Otros Listeners (klineData, klineUpdate, klineTickUpdate, mainCoins, etc.) ---
socket.on("klineData", (data) => { /* ... */ });
socket.on("klineUpdate", (data) => { /* ... */ });
socket.on("klineTickUpdate", (data) => { /* ... */ });
socket.on("mainCoinsData", (data) => { /* ... */ });
socket.on("mainCoinUpdate", (data) => { /* ... */ });
socket.on("secondaryCoinsData", (data) => { /* ... */ });
socket.on("secondaryCoinUpdate", (data) => { /* ... */ });
socket.on("preferencesData", (data) => { console.log("preferencesData", data); });
socket.on("preferenceUpdate", (data) => { console.log("preferenceUpdate", data);
}); // Espera [ { datos } ]
socket.on("error", (error) => { console.error("!!! Error recibido del servidor:", error); });
socket.on("disconnect", () => { console.log("Desconectado del servidor"); });
socket.on("connect_error", (err) => { console.error("Error de conexión:", err.message, err.data || ''); });