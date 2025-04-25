# Servidor WebSocket de Datos de Mercado Cripto AlphaTrader

## Descripción General

Este servidor WebSocket proporciona acceso en tiempo real e histórico a datos del mercado de criptomonedas. Utiliza Socket.IO para la comunicación bidireccional y se conecta a fuentes de datos externas como Binance (API y WebSockets) y CoinGecko (API) para obtener información actualizada sobre precios, volúmenes, rankings, historial de velas (klines) y más.

El servidor requiere autenticación mediante JWT para establecer la conexión. Una vez conectado, los clientes pueden suscribirse a diferentes "canales" (eventos) para recibir datos específicos.

## Conexión y Autenticación

Para interactuar con el servidor, necesitas un cliente Socket.IO compatible.

**URL del Servidor:**

- **Desarrollo Local:** `http://localhost:10101` (o el puerto que hayas configurado)
- **Producción:** `wss://tu-url-de-produccion.com` (Reemplaza con tu URL real)

**Autenticación (Obligatoria):**
La conexión inicial debe incluir un token JWT válido (obtenido a través de tu sistema de autenticación HTTP) dentro del objeto `auth.token`, prefijado con `bearer `.

**Ejemplo de Conexión (Node.js / Javascript):**

```javascript
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:10101"; // O tu URL de producción
const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsIn..."; // << TU TOKEN JWT VÁLIDO AQUÍ >>

const socket = io(SERVER_URL, {
  auth: {
    token: `bearer ${JWT_TOKEN}`, // Importante el prefijo "bearer "
  },
  // Opciones recomendadas:
  reconnection: true, // Intentar reconectar automáticamente
  reconnectionAttempts: 5, // Número de intentos
  reconnectionDelay: 1000, // Milisegundos entre intentos
  timeout: 20000, // Tiempo de espera para la conexión inicial
});

// --- Eventos de Ciclo de Vida del Socket ---

socket.on("connect", () => {
  console.log(
    `Conectado al servidor WebSocket (${socket.id}). Listo para emitir eventos.`
  );
  // Aquí puedes emitir tus solicitudes iniciales
  // socket.emit("getMainCoinsLiveData");
});

socket.on("disconnect", (reason) => {
  console.log("Desconectado del servidor:", reason);
  if (reason === "io server disconnect") {
    // El servidor cerró la conexión intencionalmente
    socket.connect(); // Puedes intentar reconectar si es necesario
  }
  // Si la razón es "io client disconnect", fue el cliente quien cerró.
});

// Errores durante la conexión inicial (incluye fallos de autenticación)
socket.on("connect_error", (err) => {
  console.error(`Error de conexión: ${err.message}`);
  if (err.data) {
    // El servidor puede enviar datos adicionales sobre el error
    console.error("Datos del error de conexión:", err.data);
  }
  // Aquí podrías intentar obtener un nuevo token si el error es de autenticación
});

// Errores generales emitidos por el servidor durante la operación
socket.on("error", (errorPayload) => {
  console.error("Error recibido del servidor:", errorPayload.message);
});
```

## Canales: Eventos Cliente -> Servidor

Estos son los eventos que tú (el cliente) debes emitir al servidor para solicitar datos o acciones.

### getMainCoinsLiveData

**Propósito:** Obtiene la lista inicial del ranking principal de criptomonedas (Top ~20 disponibles en Binance) y se suscribe a actualizaciones de precios/volumen en tiempo real para ellas.
**Payload:** Ninguno.
**Respuesta:** Datos iniciales en el evento mainCoinsData, actualizaciones en mainCoinUpdate.

### getSecondaryCoinsLiveData

**Propósito:** Obtiene una lista inicial de criptomonedas secundarias (las que siguen al ranking principal, ~30) y se suscribe a actualizaciones de precios/volumen en tiempo real para ellas.
**Payload:** Ninguno.
**Respuesta:** Datos iniciales en secondaryCoinsData, actualizaciones en secondaryCoinUpdate.

### getLiveDataWithPreferences

**Propósito:** Obtiene la lista inicial de las criptomonedas marcadas como favoritas por el usuario (según su perfil asociado al token JWT) y se suscribe a actualizaciones de precios/volumen en tiempo real para ellas.
**Payload:** Ninguno (el servidor usa el ID del token).
**Respuesta:** Datos iniciales en preferencesData, actualizaciones en preferenceUpdate.

### getCryptoDetailWithHistory

**Propósito:** Obtiene detalles completos de una criptomoneda, su historial de velas (klines) para un intervalo específico, y se suscribe a actualizaciones en tiempo real de la vela actual para ese intervalo.
**Payload:**

```typescript
{
  cryptoId: string;   // ID de CoinGecko (ej: "bitcoin", "ethereum")
  interval?: string;  // Intervalo de Binance (ej: "1m", "5m", "15m", "1h", "4h", "1d", "1w". Default: "1d")
  limit?: number;     // Número de velas históricas (Default: 30, Max: 1000)
}
```

**Respuesta:** Datos iniciales en klineData, actualizaciones de velas cerradas en klineUpdate, actualizaciones de la vela en formación en klineTickUpdate.

### getShortTermHistory

**Propósito:** Obtiene el historial de velas de 1 hora para las últimas 24, 48 o 72 horas de una criptomoneda y se suscribe a actualizaciones en tiempo real de la vela de 1 hora actual.
**Payload:**

```typescript
{
  cryptoId: string; // ID de CoinGecko (ej: "ripple")
  hours?: 24 | 48 | 72; // Periodo deseado (Default: 24)
}
```

**Respuesta:** Datos iniciales en shortTermHistoryData, actualizaciones de velas cerradas en shortTermHistoryUpdate, actualizaciones de la vela en formación en shortTermHistoryTickUpdate.

### getConversionData

**Propósito:** Calcula el valor equivalente de una cantidad específica de criptomoneda en una moneda fiduciaria.
**Payload:**

```typescript
{
  cryptoId: string; // ID de CoinGecko (ej: "cardano")
  fiatCurrency: string; // Símbolo Fiat (ej: "USD", "EUR", "COP")
  amountCrypto: number; // Cantidad de cripto a convertir
}
```

**Respuesta:** Resultado en el evento conversionData.

## Canales: Eventos Servidor -> Cliente

Estos son los eventos que el servidor emitirá hacia ti (el cliente) en respuesta a tus solicitudes o como actualizaciones.

### Datos Iniciales y Actualizaciones de Tickers

- **mainCoinsData:** `{ mainCoins: CoinData[] }` - Contiene el array inicial de las monedas principales.
- **secondaryCoinsData:** `{ secondaryCoins: CoinData[] }` - Contiene el array inicial de las monedas secundarias.
- **preferencesData:** `{ preferredCoinsData: CoinData[], preferredSymbols: string[] }` - Contiene el array inicial de las monedas preferidas y sus símbolos base.
- **mainCoinUpdate / secondaryCoinUpdate / preferenceUpdate:** `[ CoinDataLive ]` - Contiene un arreglo con un solo objeto CoinDataLive representando la moneda específica cuyo precio o volumen cambió.

### Datos de Velas (Klines) - Historial General

- **klineData:** `{ binanceSymbol: string, interval: string, klines: KlineData[], coinDetail: CoinData }` - Contiene el array inicial de velas históricas formateadas (klines) para el símbolo e intervalo solicitados, junto con los detalles completos de la moneda (coinDetail).
- **klineUpdate:** `KlineData` - Contiene el objeto formateado de una vela cerrada para el símbolo e intervalo suscritos.
- **klineTickUpdate:** `KlineTickData` - Contiene el objeto formateado que representa el estado actual de la vela en formación para el símbolo e intervalo suscritos.

### Datos de Velas (Klines) - Historial Corto Plazo (1h)

- **shortTermHistoryData:** `{ binanceSymbol: string, interval: "1h", hours: number, klines: KlineData[] }` - Contiene el array inicial de velas históricas de 1 hora para el símbolo y periodo (hours) solicitados.
- **shortTermHistoryUpdate:** `KlineData` - Contiene el objeto formateado de una vela de 1 hora cerrada.
- **shortTermHistoryTickUpdate:** `KlineTickData` - Contiene el objeto formateado que representa el estado actual de la vela de 1 hora en formación.

### Datos de Conversión

- **conversionData:** `{ cryptoId: string, fiatCurrency: string, amountCrypto: number, amountConverted: number }` - Contiene el resultado de la conversión solicitada.

## Formatos de Datos Principales

Los objetos de datos devueltos intentan seguir una estructura estándar. Aquí hay ejemplos clave:

### CoinData

```json
{
  "id": "bitcoin",
  "name": "Bitcoin",
  "symbol": "btc",
  "binanceSymbol": "BTCUSDT",
  "image": "https://url.to/image.png",
  "marketCap": 1234567890123,
  "marketCapRank": 1,
  "currentPrice": 65123.45,
  "high24h": 66000.1,
  "low24h": 64500.0,
  "priceChangePercentage24h": 1.23,
  "totalVolume": 45000100200,
  "trend24h": "bullish",
  "lastUpdated": "2025-04-25T10:30:00.123Z"
}
```

### CoinDataLive

```json
{
  "id": null,
  "name": null,
  "symbol": "btc",
  "binanceSymbol": "BTCUSDT",
  "image": null,
  "marketCap": null,
  "marketCapRank": null,
  "currentPrice": 65124.8,
  "high24h": 66000.1,
  "low24h": 64500.0,
  "priceChangePercentage24h": null,
  "totalVolume": 45000950800,
  "trend24h": null,
  "lastUpdated": "2025-04-25T10:35:15.456Z",
  "volumeQuote24h": 2930123456.78
}
```

### KlineData

```json
{
  "id": null,
  "name": null,
  "symbol": "btc",
  "binanceSymbol": "BTCUSDT",
  "image": null,
  "marketCap": null,
  "marketCapRank": null,
  "currentPrice": 65250.0,
  "highPrice": 65300.0,
  "lowPrice": 65100.0,
  "openPrice": 65150.0,
  "priceChangePercentage": null,
  "totalVolume": 123.45,
  "trend": "bullish",
  "openTime": "2025-04-25T10:00:00.000Z",
  "closeTime": "2025-04-25T10:59:59.999Z",
  "lastUpdated": "2025-04-25T10:59:59.999Z"
}
```

### KlineTickData

```json
{
  "id": null,
  "name": null,
  "symbol": "btc",
  "binanceSymbol": "BTCUSDT",
  "image": null,
  "marketCap": null,
  "marketCapRank": null,
  "currentPrice": 65275.5,
  "highPrice": 65280.0,
  "lowPrice": 65260.0,
  "openPrice": 65250.0,
  "priceChangePercentage": 0.39,
  "totalVolume": 55.67,
  "trend": "bullish",
  "openTime": "2025-04-25T11:00:00.000Z",
  "closeTime": "2025-04-25T11:59:59.999Z",
  "lastUpdated": "2025-04-25T11:15:30.789Z",
  "eventTime": 1745678130789,
  "isForming": true
}
```

## Manejo de Errores del Servidor

Si ocurre un error en el servidor mientras procesa tu solicitud, emitirá un evento "error".

**Evento:** `error`
**Payload:** `{ message: string }` (Descripción del error)

Debes tener un listener para este evento en tu cliente para manejar problemas inesperados:

```javascript
socket.on("error", (errorPayload) => {
  console.error("<<< ERROR DEL SERVIDOR >>>:", errorPayload.message);
  // Aquí podrías mostrar un mensaje al usuario, intentar re-solicitar, etc.
});
```
