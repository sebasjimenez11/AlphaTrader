// test/socketClientTest.js
import { io } from "socket.io-client";

// ... (configuración de conexión y token) ...
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxYTc4YWQ5LTg3MWItNDVhMC1iMjNiLTAzNWVjZmFhODIwNiIsImVtYWlsIjoic2ViYXNqaW1lbmV6MTEyMUBnbWFpbC5jb20iLCJjb21wbGV0ZWRQZXJmaWwiOnRydWUsImlhdCI6MTc0NTU3Njc5OSwiZXhwIjoxNzQ1NTgwMzk5fQ.fbY3GsjCb8smxnWKqSw2NexT9-3RcnXDpLH4Bke2V6I"; // Reemplaza con un token válido
const socket = io("http://localhost:10101", { // O tu URL de producción
  auth: {
    token: `bearer ${token}`
  }
});

socket.on("connect", () => {
  console.log("Conectado al servidor con ID:", socket.id);

  // --- Solicitud de Historial Corto Plazo (24h, 48h, o 72h) ---
  const requestShortTermData = {
    cryptoId: "ethereum", // ID de CoinGecko
    hours: 48            // Periodo deseado: 24, 48 o 72
  };
  console.log("Emitiendo getShortTermHistory con:", requestShortTermData);
  socket.emit("getShortTermHistory", requestShortTermData); // <-- Evento añadido en marketEvents


  // --- (Opcional) Puedes seguir emitiendo otras solicitudes ---
  // const requestKlineData = { cryptoId: "bitcoin", interval: "1d", limit: 30 };
  // socket.emit("getCryptoDetailWithHistory", requestKlineData);

});

// --- Listeners para Historial Corto Plazo ---

// 1. Recibe los datos históricos iniciales (velas de 1h)
socket.on("shortTermHistoryData", (data) => {
  console.log("+++ Datos Históricos Corto Plazo Recibidos (shortTermHistoryData) +++");
  console.log("Símbolo:", data.binanceSymbol);
  console.log("Intervalo:", data.interval); // Siempre será '1h'
  console.log("Horas:", data.hours);
  console.log(`Recibidos ${data.klines?.length || 0} klines históricos de 1h.`);
  // Procesar data.klines para mostrar gráfico inicial
   if(data.klines && data.klines.length > 0) {
       console.log("Última vela histórica (1h):", data.klines[data.klines.length - 1]);
   }
});

// 2. Recibe una vela COMPLETA de 1h cuando se cierra
socket.on("shortTermHistoryUpdate", (closedCandle) => {
  console.log("--- Vela 1h Cerrada Recibida (shortTermHistoryUpdate) ---");
  console.log("Hora Cierre:", closedCandle.closeTime);
  console.log("Precio Cierre:", closedCandle.currentPrice);
  // Actualizar gráfico/tabla añadiendo esta vela cerrada
});

// 3. Recibe actualizaciones de la vela de 1h que se está FORMANDO
socket.on("shortTermHistoryTickUpdate", (tickData) => {
  console.log("--- Tick Vela 1h Actual Recibido (shortTermHistoryTickUpdate) ---");
  console.log("Hora Evento:", tickData.lastUpdated);
  console.log("Precio Actual:", tickData.currentPrice);
  // Actualizar la última vela (en formación) en el gráfico/tabla
});


// --- Otros Listeners (klineData, klineUpdate, klineTickUpdate, mainCoins, etc.) ---
socket.on("klineData", (data) => { /* ... */ });
socket.on("klineUpdate", (data) => { /* ... */ });
socket.on("klineTickUpdate", (data) => { /* ... */ });
socket.on("mainCoinsData", (data) => { /* ... */ });
socket.on("mainCoinUpdate", (data) => { /* ... */ });
socket.on("secondaryCoinsData", (data) => { /* ... */ });
socket.on("secondaryCoinUpdate", (data) => { /* ... */ });
socket.on("preferencesData", (data) => { /* ... */ });
socket.on("preferenceUpdate", (data) => { /* ... */ }); // Espera [ { datos } ]
socket.on("error", (error) => { console.error("!!! Error recibido del servidor:", error); });
socket.on("disconnect", () => { console.log("Desconectado del servidor"); });
socket.on("connect_error", (err) => { console.error("Error de conexión:", err.message, err.data || ''); });