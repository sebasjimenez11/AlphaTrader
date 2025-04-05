// utils/coinDataFormatter.js

/**
 * Formatea la data de una coin según el DTO estandarizado.
 * Se espera que `coin` tenga propiedades: id, symbol, market_cap, current_price, total_volume.
 * Se asignan valores nulos si no están presentes.
 */
export function formatCoinData(coin) {
  return {
    date: new Date().toISOString(), // Fecha de emisión/actualización
    Volumen: coin.total_volume || coin.volumen || null,
    Precio: coin.current_price || coin.precio || null,
    CapMerc: coin.market_cap || coin.capitalizacion || null,
    Id: coin.id || null,
    symbolo: coin.symbol || null,
    // Se arma el símbolo de Binance: si la propiedad ya existe se puede usar; sino se forma concatenando "TUSD" en mayúsculas.
    symboloBinance: coin.binance_symbol
      ? coin.binance_symbol.toUpperCase()
      : (coin.symbol ? (coin.symbol + "TUSD").toUpperCase() : null)
  };
}

/**
 * Formatea la data recibida en actualizaciones en vivo (desde Binance WebSocket).
 * Se espera que `data` tenga, por ejemplo, la propiedad "s" (símbolo), "c" (último precio) y "v" (volumen).
 */
export function formatLiveUpdate(data) {
  // Se asume que el campo "s" contiene el símbolo de Binance (ejemplo: "BTCUSDT")
  return {
    date: new Date().toISOString(),
    Volumen: data.v || null,
    Precio: data.c || null,
    CapMerc: null, // La data en vivo de Binance no incluye market cap
    Id: null,      // No se envía el id en el stream en vivo
    // Para el símbolo se puede derivar quitando "USDT" si se requiere
    symbolo: data.s ? data.s.replace("USDT", "") : null,
    symboloBinance: data.s ? data.s.toUpperCase() : null
  };
}

/**
 * Formatea cada vela o candle de data histórica.
 * Se recibe el candle original y, opcionalmente, el símbolo (para derivar el símbolo de Binance).
 */
export function formatHistoricalCandle(candle, symbol = null) {
  return {
    date: new Date(candle.openTime).toISOString(),
    Volumen: candle.volume || null,
    Precio: candle.close || null,
    CapMerc: null, // La data histórica de velas no trae market cap
    Id: null,      // No se dispone del id en esta data
    symbolo: symbol ? symbol.replace("USDT", "") : null,
    symboloBinance: symbol ? symbol.toUpperCase() : null
  };
}

/**
 * Convierte un arreglo de items formateados en un objeto, usando la llave que se indique.
 * Por ejemplo, usando "symboloBinance" se crea: { BTCUSDT: { ... }, ETHUSDT: { ... } }
 */
export function arrayToObjectByKey(array, key = "symboloBinance") {
  return array.reduce((acc, item) => {
    if (item[key]) {
      acc[item[key]] = item;
    }
    return acc;
  }, {});
}
