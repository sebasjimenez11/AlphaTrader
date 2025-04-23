// utils/coinDataFormatter.js

/**
 * Formatea la data de una criptomoneda según el DTO estandarizado.
 */
export function formatCoinData(coin) {
    return {
        date: new Date().toISOString(), // Fecha de emisión/actualización
        Volumen: coin.total_volume || null,
        Precio: coin.current_price || null,
        CapMerc: coin.market_cap || null,
        Id: coin.id || null,
        symbolo: coin.symbol || null,
        symboloBinance: (coin.symbol + "TUSD").toUpperCase()
    };
}


/**
 * Formatea la data recibida en actualizaciones en vivo (desde Binance WebSocket).
 * Se espera que `data` tenga, por ejemplo, la propiedad "s" (símbolo), "c" (último precio) y "v" (volumen).
 */
export function formatLiveUpdate(data) {
    const price = parseFloat(data.c);
    const volumeBaseAsset = parseFloat(data.v);

    // Estimar la capitalización de mercado basada en el volumen negociado
    const estimatedMarketCap = price * volumeBaseAsset;

    return {
        date: new Date().toISOString(),
        Volumen: volumeBaseAsset,
        Precio: price,
        CapMerc: estimatedMarketCap,
        symbolo: data.s.replace('USDT', ''),
        symboloBinance: data.s.toUpperCase(),
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

