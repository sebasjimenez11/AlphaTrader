// utils/coinDataFormatter.js

/**
 * Determina la tendencia basada en el cambio de precio en 24h.
 * @param {number | null} priceChangePercentage - El cambio porcentual del precio en 24 horas.
 * @returns {'bullish' | 'bearish' | 'neutral' | null} - La tendencia o null si no hay datos.
 */
function getTrend(priceChangePercentage) {
    if (priceChangePercentage === null || priceChangePercentage === undefined) {
        return null;
    }
    if (priceChangePercentage > 0) {
        return 'bullish';
    }
    if (priceChangePercentage < 0) {
        return 'bearish';
    }
    return 'neutral';
}

/**
 * Formatea la data de una criptomoneda desde APIs como CoinGecko (coins/markets).
 * Asegura un formato estándar enriquecido.
 * @param {object} coin - El objeto de la moneda de la API (ej. CoinGecko).
 * @param {Set<string>} binanceSymbolsSet - Un Set con los símbolos de pares USDT disponibles en Binance (ej. 'BTCUSDT', 'ETHUSDT').
 * @returns {object | null} - El objeto formateado o null si no tiene símbolo de Binance válido.
 */
export function formatCoinData(coin, binanceSymbolsSet) {
    if (!coin || !coin.symbol) {
        return null; // No se puede procesar sin símbolo
    }

    const symbolLower = coin.symbol.toLowerCase();
    // Intenta generar el símbolo de Binance (asumiendo USDT como par principal)
    const potentialBinanceSymbol = (symbolLower + "usdt").toUpperCase();

    // Validar si este símbolo existe en el set de Binance
    if (!binanceSymbolsSet.has(potentialBinanceSymbol)) {
        // Opcional: podrías intentar con TUSD u otros pares si fuera necesario
        // const potentialBinanceSymbolTUSD = (symbolLower + "tusd").toUpperCase();
        // if (!binanceSymbolsSet.has(potentialBinanceSymbolTUSD)) {
        // console.warn(`Símbolo ${potentialBinanceSymbol} (o TUSD) no encontrado en Binance para ${coin.id}`);
        return null; // No incluir si no está confirmado en Binance
        // }
        // potentialBinanceSymbol = potentialBinanceSymbolTUSD; // Si encontraste TUSD
    }

    const priceChangePercentage = coin.price_change_percentage_24h;

    return {
        id: coin.id || null, // ID de la fuente (ej. 'bitcoin')
        name: coin.name || null, // Nombre legible (ej. 'Bitcoin')
        symbol: symbolLower, // Símbolo base (ej. 'btc')
        binanceSymbol: potentialBinanceSymbol, // Símbolo confirmado en Binance (ej. 'BTCUSDT')
        image: coin.image || null, // URL de la imagen
        marketCap: coin.market_cap || null, // Capitalización de mercado
        marketCapRank: coin.market_cap_rank || null, // Ranking por capitalización
        currentPrice: coin.current_price || null, // Precio actual (en USD generalmente)
        high24h: coin.high_24h || null, // Precio máximo en 24h
        low24h: coin.low_24h || null, // Precio mínimo en 24h
        priceChangePercentage24h: priceChangePercentage, // Cambio % en 24h
        totalVolume: coin.total_volume || null, // Volumen total negociado en 24h
        trend24h: getTrend(priceChangePercentage), // Tendencia derivada
        lastUpdated: coin.last_updated || new Date().toISOString(), // Fecha de última actualización de CoinGecko
        // Campos anteriores para mantener cierta compatibilidad (si es necesario, si no, se pueden quitar)
        // --- Inicio campos redundantes/anteriores ---
        // date: new Date().toISOString(), // Fecha de formateo/emisión local
        // Volumen: coin.total_volume || null,
        // Precio: coin.current_price || null,
        // CapMerc: coin.market_cap || null,
        // Id: coin.id || null,
        // symbolo: symbolLower,
        // symboloBinance: potentialBinanceSymbol
        // --- Fin campos redundantes/anteriores ---
    };
}


/**
 * Formatea la data recibida en actualizaciones en vivo (desde Binance WebSocket).
 * Alineado con el formato estándar donde sea posible.
 * @param {object} data - Datos del miniTicker de Binance (ej. { s: 'BTCUSDT', c: '65000', v: '1200' }).
 * @returns {object} - Objeto formateado para la actualización en vivo.
 */
export function formatLiveUpdate(data) {
    const price = parseFloat(data.c); // Precio de cierre (último precio)
    const volumeBaseAsset = parseFloat(data.v); // Volumen del activo base (ej. BTC)
    const volumeQuoteAsset = parseFloat(data.q); // Volumen del activo cotizado (ej. USDT)
    const binanceSymbol = data.s.toUpperCase();
    const symbol = binanceSymbol.replace(/(USDT|TUSD|BUSD|USDC)$/, '').toLowerCase(); // Extraer símbolo base

    // No se puede calcular CapMerc real desde el ticker, es mejor omitirlo o dejarlo null.
    // const estimatedMarketCap = price * volumeBaseAsset; // Esto no es Market Cap

    return {
        id: null, // No disponible en ticker
        name: null, // No disponible en ticker
        symbol: symbol,
        binanceSymbol: binanceSymbol,
        image: null, // No disponible en ticker
        marketCap: null, // No disponible en ticker
        marketCapRank: null, // No disponible en ticker
        currentPrice: price,
        high24h: parseFloat(data.h), // Precio máximo 24h del ticker
        low24h: parseFloat(data.l), // Precio mínimo 24h del ticker
        priceChangePercentage24h: null, // No directamente en miniTicker, necesitarías calcularlo o usar otro stream
        totalVolume: volumeBaseAsset, // Volumen del activo base en 24h
        trend24h: null, // No disponible, se podría calcular si tuvieramos precio de apertura 24h (data.o)
        lastUpdated: new Date().toISOString(),
        // --- Campos anteriores ---
        // date: new Date().toISOString(),
        // Volumen: volumeBaseAsset,
        // Precio: price,
        // CapMerc: null, // Era una estimación incorrecta
        // symbolo: symbol,
        // symboloBinance: binanceSymbol,
        // --- Fin campos anteriores ---
        // Extra: Podrías querer incluir el volumen en la moneda cotizada también
        volumeQuote24h: volumeQuoteAsset
    };
}

/**
 * Formatea cada vela o candle de data histórica (Binance Klines).
 * Alineado con el formato estándar donde sea posible.
 * @param {Array} candle - Array de datos de la vela de Binance [openTime, open, high, low, close, volume, closeTime, ...].
 * @param {string} binanceSymbol - El símbolo del par (ej. "BTCUSDT").
 * @returns {object} - Objeto formateado para la vela.
 */
export function formatHistoricalCandle(candle, binanceSymbol) {
    const symbol = binanceSymbol ? binanceSymbol.replace(/(USDT|TUSD|BUSD|USDC)$/, '').toLowerCase() : null;
    const closePrice = parseFloat(candle[4]);
    const volume = parseFloat(candle[5]);

    return {
        id: null, // No disponible
        name: null, // No disponible
        symbol: symbol,
        binanceSymbol: binanceSymbol ? binanceSymbol.toUpperCase() : null,
        image: null, // No disponible
        marketCap: null, // No disponible
        marketCapRank: null, // No disponible
        currentPrice: closePrice, // Usamos el precio de cierre como referencia del punto
        highPrice: parseFloat(candle[2]), // Precio máximo del intervalo
        lowPrice: parseFloat(candle[3]),  // Precio mínimo del intervalo
        openPrice: parseFloat(candle[1]), // Precio de apertura del intervalo
        priceChangePercentage: null, // Se podría calcular si se necesita: (close - open) / open * 100
        totalVolume: volume, // Volumen del activo base en el intervalo
        trend: null, // Se podría calcular: close > open ? 'bullish' : 'bearish'
        openTime: new Date(candle[0]).toISOString(), // Tiempo de apertura de la vela
        closeTime: new Date(candle[6]).toISOString(), // Tiempo de cierre de la vela
        lastUpdated: new Date(candle[6]).toISOString(), // Usamos el cierre como referencia
        // --- Campos anteriores ---
        // date: new Date(candle[0]).toISOString(), // openTime
        // Volumen: volume,
        // Precio: closePrice,
        // CapMerc: null,
        // Id: null,
        // symbolo: symbol,
        // symboloBinance: binanceSymbol ? binanceSymbol.toUpperCase() : null
        // --- Fin campos anteriores ---
    };
}


/**
 * Encuentra el primer objeto en un arreglo que coincida con un valor específico
 * para una clave dada y lo devuelve envuelto en un nuevo arreglo.
 * @param {Array<object>} array - El arreglo de objetos a buscar.
 * @param {string} key - La propiedad del objeto a comprobar (ej. "binanceSymbol").
 * @param {*} value - El valor que debe tener la propiedad 'key'.
 * @returns {Array<object>} - Un arreglo conteniendo el primer objeto encontrado, o un arreglo vacío [].
 */
export function arrayToObjectByKey(array, key, value) {
    if (!Array.isArray(array)) {
        return []; // Devuelve vacío si la entrada no es un arreglo
    }
    // Usar .find() para buscar el primer elemento que cumpla la condición
    const foundItem = array.find(item => item && item[key] === value);

    // Si se encontró un item, devolverlo dentro de un arreglo
    if (foundItem) {
        return [foundItem];
    } else {
        // Si no se encontró, devolver un arreglo vacío
        return [];
    }
}