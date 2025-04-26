import axios from "axios";
import AppError from "../utils/appError.js";
// Asegúrate que la importación de formatCoinData y arrayToObjectByKey esté correcta
import { formatCoinData, arrayToObjectByKey } from "../utils/coinDataFormatter.js";

class CoinGeckoAdapter {
    constructor(redisRepository) {
        this.redisRepository = redisRepository;
        this.baseUrl = process.env.BASE_URL_COINGECKO; // "https://api.coingecko.com/api/v3"
        this.binanceApiBaseUrl = "https://api.binance.com/api/v3"; // URL base para API Binance
    }

    // Helper: esperar ms milisegundos (ya lo tenías)
    sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Obtiene y cachea un Set con todos los símbolos de pares USDT TRADABLES en Binance.
     * Ejemplo: {'BTCUSDT', 'ETHUSDT', 'ADAUSDT', ...}
     * @returns {Promise<Set<string>>} - Un Set con los símbolos de Binance terminados en USDT.
     */
    async getBinanceUsdtSymbols() {
        const cacheKey = 'binanceUsdtSymbolsSet';
        try {
            let binanceSymbols = await this.redisRepository.get(cacheKey);
            if (binanceSymbols && Array.isArray(binanceSymbols)) {
                // console.log("Usando símbolos de Binance (USDT) cacheados.");
                return new Set(binanceSymbols);
            }

            // console.log("Obteniendo símbolos de Binance (USDT) desde la API...");
            const response = await axios.get(`${this.binanceApiBaseUrl}/exchangeInfo`);
            const symbols = response.data.symbols;

            // Filtrar por pares que terminen en USDT y estén TRADING
            const usdtSymbolsSet = new Set(
                symbols
                    .filter(item => item.symbol.endsWith('USDT') && item.status === 'TRADING')
                    .map(item => item.symbol.toUpperCase()) // Asegurar mayúsculas
            );

            // Guardar como array en Redis con TTL de 1 hora (3600 segundos)
            await this.redisRepository.set(cacheKey, Array.from(usdtSymbolsSet), 3600);
            // console.log(`Encontrados ${usdtSymbolsSet.size} símbolos USDT tradables en Binance.`);
            return usdtSymbolsSet;
        } catch (e) {
            console.error(`Error obteniendo/cacheando símbolos de Binance: ${e.message}`);
            // Devolver un Set vacío o lanzar error dependiendo de la criticidad
            // Si es crítico para la funcionalidad, mejor lanzar el error.
            throw new AppError(`Error al obtener símbolos de Binance: ${e.message}`, 505);
            // return new Set(); // Alternativa: devolver vacío para no bloquear todo
        }
    }


    /**
     * Obtiene la lista de monedas desde CoinGecko (/coins/markets) filtrada por disponibilidad en Binance.
     * @param {number} perPage - Cuántas monedas obtener por página de CoinGecko.
     * @param {number} page - Qué página obtener de CoinGecko.
     * @returns {Promise<Array<object>>} - Lista de objetos de moneda formateados y filtrados.
     */
    async getCoinListFromCoinGecko(perPage = 250, page = 1) {
        try {
            const binanceSymbolsSet = await this.getBinanceUsdtSymbols();
            if (binanceSymbolsSet.size === 0) {
                console.warn("No se pudieron obtener los símbolos de Binance. La lista de CoinGecko no se filtrará.");
                // Considera si devolver vacío o continuar sin filtrar
                // return [];
            }

            // console.log(`Obteniendo página ${page} (${perPage} coins) de CoinGecko...`);
            const response = await axios.get(`${this.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: perPage,
                    page: page,
                    sparkline: false,
                    price_change_percentage: '24h' // Asegurar que incluya el cambio 24h
                },
            });

            const coingeckoCoins = response.data || [];
            // console.log(`Recibidas ${coingeckoCoins.length} monedas de CoinGecko. Filtrando por Binance...`);

            // Formatear Y filtrar en un solo paso
            const formattedAndFilteredCoins = coingeckoCoins
                .map(coin => formatCoinData(coin, binanceSymbolsSet)) // Formatea y valida contra Binance
                .filter(coin => coin !== null); // Descarta los que retornaron null (no válidos/no en Binance)

            // console.log(`Lista final contiene ${formattedAndFilteredCoins.length} monedas disponibles en Binance USDT.`);
            return formattedAndFilteredCoins;

        } catch (error) {
            console.error(`Error al obtener/procesar coins de CoinGecko: ${error.message}`);
            // Lanza el error para que sea manejado por el llamador
            throw new AppError(`Error en getCoinListFromCoinGecko: ${error.message}`, error.response?.status || 505);
        }
    }

    // getCoinListFromBinance ya no parece necesaria si filtramos la de CoinGecko,
    // a menos que quieras una lista *solo* con los símbolos base de Binance.
    // La dejo comentada por si acaso.
    /*
    async getCoinListFromBinance() {
        try {
            const binanceSymbolsSet = await this.getBinanceUsdtSymbols();
            const list = Array.from(binanceSymbolsSet).map(binanceSymbol => {
                 const symbol = binanceSymbol.replace('USDT', '').toLowerCase();
                 // Crear un objeto parcial formateado (faltan datos de mercado)
                 return {
                     id: symbol, // Usar el símbolo base como ID tentativo
                     name: symbol.toUpperCase(), // Nombre tentativo
                     symbol: symbol,
                     binanceSymbol: binanceSymbol,
                     image: null, marketCap: null, marketCapRank: null, currentPrice: null,
                     high24h: null, low24h: null, priceChangePercentage24h: null, totalVolume: null,
                     trend24h: null, lastUpdated: null
                 };
            });
            return list;
        } catch (error) {
            throw new AppError(`Error al obtener coins de Binance: ${error.message}`, 505);
        }
    }
    

    /**
     * Obtiene el ranking de las N principales monedas por capitalización que están en Binance USDT.
     * Se almacena en caché en Redis por 60 segundos.
     * Usa getCoinListFromCoinGecko internamente.
     * @param {number} topN - Cuántas monedas incluir en el ranking (ej. 20).
     * @returns {Promise<Array<object>>} - Array de monedas formateadas del ranking.
     */
    async coinsRanking(topN = 20) {
        const cacheKey = `coinsRanking:${topN}`;
        try {
            let rankingCoins = await this.redisRepository.get(cacheKey);
            // Validar si el caché es un array y tiene elementos (o los que esperamos)
            if (rankingCoins && Array.isArray(rankingCoins) && rankingCoins.length > 0) {
                // console.log(`Usando ranking (${topN}) cacheado.`);
                return rankingCoins;
            }

            // console.log(`Generando ranking (${topN}) desde CoinGecko/Binance...`);
            // Obtener una página inicial de CoinGecko (suficiente para cubrir topN tras filtrar)
            // Podríamos necesitar más de 'topN' de CoinGecko para asegurar 'topN' finales tras filtrar.
            // Pedimos 50 para tener margen si queremos el top 20. Ajusta si necesitas más.
            const coinsFromGecko = await this.getCoinListFromCoinGecko(50, 1);

            // Tomar los primeros topN resultados que ya vienen ordenados por market cap y filtrados
            const finalRanking = coinsFromGecko.slice(0, topN);

            // Guardar en caché solo si obtuvimos resultados
            if (finalRanking.length > 0) {
                await this.redisRepository.set(cacheKey, finalRanking, 60); // Cache por 60 segundos
            } else {
                console.warn("No se generaron monedas para el ranking después de filtrar.");
            }

            return finalRanking;
        } catch (e) {
            // Si getCoinListFromCoinGecko lanza error, se propagará
            console.error(`Error al obtener el ranking de monedas: ${e.message}`);
            // Lanzar para que el service lo maneje
            throw new AppError(`Error al obtener el ranking (${topN}): ${e.message}`, 505);
        }
    }

    /**
     * Obtiene una lista más completa de monedas disponibles en Binance USDT, combinando potencialmente
     * varias páginas de CoinGecko si fuera necesario.
     * Se almacena en caché en Redis por 900 segundos (15 minutos)
     * @param {number} limit - Número aproximado deseado de monedas en la lista final.
     * @returns {Promise<Array<object>>} - Array de monedas formateadas.
     */
    async coinsList(limit = 250) {
        const cacheKey = `coinsList:${limit}`;
        try {
            let coins = await this.redisRepository.get(cacheKey);
            if (coins && Array.isArray(coins) && coins.length > 0) {
                // console.log(`Usando lista de monedas (${limit}) cacheada.`);
                return coins;
            }

            // console.log(`Generando lista de monedas (${limit}) desde CoinGecko/Binance...`);
            // Podríamos necesitar obtener varias páginas de coingecko para alcanzar el límite
            // después de filtrar. Haremos una llamada inicial y podríamos añadir más si es necesario.
            const firstPageCoins = await this.getCoinListFromCoinGecko(250, 1); // Obtener hasta 250 en la primera página

            // Por ahora, usaremos solo la primera página. Si necesitas más,
            // podrías implementar un bucle para obtener más páginas hasta alcanzar 'limit'.
            const finalList = firstPageCoins.slice(0, limit); // Limitar al número deseado

            if (finalList.length > 0) {
                await this.redisRepository.set(cacheKey, finalList, 900); // Cache por 15 minutos
            } else {
                console.warn("No se generaron monedas para la lista completa después de filtrar.");
            }

            return finalList;
        } catch (e) {
            console.error(`Error al obtener la lista de monedas: ${e.message}`);
            throw new AppError(`Error al obtener la lista de monedas (${limit}): ${e.message}`, 505);
        }
    }


    /**
         * Obtiene información detallada de una moneda específica por su ID de CoinGecko.
         * PRIMERO busca en la lista cacheada por `coinsList()`. Si no la encuentra allí,
         * devuelve null para evitar llamadas excesivas a la API /coins/{id} y prevenir errores 429.
         * @param {string} coinId - El ID de la moneda en CoinGecko (ej. "bitcoin").
         * @returns {Promise<object | null>} - Objeto formateado de la moneda si se encuentra en la caché, o null si no.
         */
    async coinById(coinId) {
        try {
            // 1. Obtener la lista de monedas desde la caché (o generarla si no existe)
            // Se asume que coinsList() maneja su propia caché y lógica de obtención/filtrado.
            // Usamos un límite razonable (ej. 250) que probablemente contenga las monedas más solicitadas.
            // Puedes ajustar este límite si tu caso de uso lo requiere.
            const cachedCoinsList = await this.coinsList(250); // Llama a la función que usa la caché

            // 2. Buscar la moneda por su 'id' dentro de la lista obtenida
            const foundCoin = cachedCoinsList.find(coin => coin.id === coinId);

            // 3. Si se encuentra en la lista cacheada, devolverla directamente.
            // Esta moneda ya debería estar formateada y validada contra Binance
            // por el proceso dentro de getCoinListFromCoinGecko y formatCoinData.
            if (foundCoin) {
                // console.log(`Moneda ${coinId} encontrada en la lista cacheada.`);
                return foundCoin;
            }

            // 4. Si NO se encuentra en la lista cacheada:
            // Devolvemos null para evitar hacer la llamada individual a la API /coins/{id}
            // y así prevenir los errores 429 (Too Many Requests).
            // Esta es la principal diferencia con el enfoque anterior.
            console.warn(`Moneda con ID '${coinId}' no encontrada en la lista cacheada (top ${cachedCoinsList.length}). No se consultará la API individualmente.`);
            return null;

            // --- Alternativa (NO RECOMENDADA SI EL PROBLEMA ES 429) ---
            // Si *necesitaras* intentar obtener la moneda sí o sí, incluso si no está
            // en la caché, podrías descomentar el bloque de abajo, pero estarías
            // expuesto nuevamente a errores 429 para esas monedas menos comunes.
            /*
            console.warn(`Moneda ${coinId} no encontrada en caché. Intentando consulta individual a la API...`);
            try {
                const response = await axios.get(`${this.baseUrl}/coins/${coinId}`, {
                    params: {
                        localization: false,
                        tickers: false,
                        market_data: true,
                        community_data: false,
                        developer_data: false,
                        sparkline: false,
                    },
                });
                const coinDataFromGecko = response.data;
                const binanceSymbolsSet = await this.getBinanceUsdtSymbols();
                const coinMarketData = coinDataFromGecko.market_data;
                const mappedCoin = {
                     id: coinDataFromGecko.id,
                     symbol: coinDataFromGecko.symbol,
                     name: coinDataFromGecko.name,
                     image: coinDataFromGecko.image?.large || coinDataFromGecko.image?.small,
                     market_cap: coinMarketData?.market_cap?.usd,
                     market_cap_rank: coinMarketData?.market_cap_rank,
                     current_price: coinMarketData?.current_price?.usd,
                     high_24h: coinMarketData?.high_24h?.usd,
                     low_24h: coinMarketData?.low_24h?.usd,
                     price_change_percentage_24h: coinMarketData?.price_change_percentage_24h,
                     total_volume: coinMarketData?.total_volume?.usd,
                     last_updated: coinMarketData?.last_updated
                 };
                const formattedCoin = formatCoinData(mappedCoin, binanceSymbolsSet);
                if (!formattedCoin) {
                     console.warn(`La moneda ${coinId} (obtenida individualmente) no está disponible en Binance USDT o faltan datos.`);
                     return null;
                }
                return formattedCoin;
            } catch (individualError) {
                if (individualError.response && individualError.response.status === 404) {
                     console.warn(`Moneda con ID ${coinId} no encontrada en CoinGecko (API individual).`);
                     return null;
                }
                 // Si es un error 429 aquí, lo reportamos
                if (individualError.response && individualError.response.status === 429) {
                    console.error(`Error 429 al obtener detalles individuales de ${coinId}. Rate limit excedido.`);
                } else {
                    console.error(`Error al obtener detalles individuales de ${coinId}: ${individualError.message}`);
                }
                // Lanzamos un AppError específico para el fallo individual
                throw new AppError(`Error en fallback coinById (${coinId}): ${individualError.message}`, individualError.response?.status || 505);
            }
            */
            // --- Fin de la Alternativa ---

        } catch (error) {
            // Captura errores generales, incluyendo los que puedan venir de this.coinsList()
            console.error(`Error en coinById buscando ${coinId} (posiblemente desde caché): ${error.message}`);
            // Re-lanzar como AppError para manejo consistente en capas superiores
            if (error instanceof AppError) {
                throw error;
            }
            // Usar un código de estado genérico si no es un AppError conocido
            throw new AppError(`Error procesando coinById para ${coinId}: ${error.message}`, 500);
        }
    }

    /**
     * Busca monedas por símbolo (ej. 'btc') en la lista cacheada `coinsList`.
     * Devuelve un objeto con las monedas encontradas, usando binanceSymbol como clave.
     * @param {string} symbolQuery - El símbolo a buscar (case-insensitive).
     * @returns {Promise<object>} - Objeto con las monedas encontradas { 'BTCUSDT': {...}, ... }
     */
    async coinsBySymbol(symbolQuery) {
        try {
            // Usaremos la lista cacheada (o la generaremos si no existe)
            const allCoins = await this.coinsList(); // Obtiene la lista filtrada y formateada
            const lowerCaseQuery = symbolQuery.toLowerCase();

            const filtered = allCoins.filter(coin =>
                coin.symbol.toLowerCase().includes(lowerCaseQuery)
            );

            // Convertir a objeto usando binanceSymbol como clave
            return arrayToObjectByKey(filtered, "binanceSymbol");

        } catch (e) {
            console.error(`Error al buscar monedas por símbolo ${symbolQuery}: ${e.message}`);
            throw new AppError(e.message, 505); // Re-lanzar
        }
    }


    // --- Métodos de Conversión y Forex (sin cambios importantes requeridos por ahora) ---

    async getAllForeignExchange() {
        // ... (código existente)
        try {
            const foreignExchangeList = await this.redisRepository.get('foreignExchangeList');
            if (foreignExchangeList && Array.isArray(foreignExchangeList) && foreignExchangeList.length > 0) {
                return foreignExchangeList;
            }
            // Considera usar una fuente más oficial o mantenida si es posible
            const { data } = await axios.get('https://gist.githubusercontent.com/stevekinney/8334552/raw/currency-symbols.json');
            if (data && data.length > 0) {
                await this.redisRepository.set('foreignExchangeList', data, 3600 * 24); // Cachear por 24h
                return data;
            } else {
                throw new AppError('No se encontró el recurso de divisas buscado', 404);
            }
        } catch (e) {
            console.error(`Error al obtener lista de divisas: ${e.message}`);
            throw new AppError(e.message, 505);
        }
    }

    async convertirCryptoAmoneda(cryptoId, fiatCurrency, cantidadCrypto) {
        // ... (código existente, parece correcto usar CoinGecko para esto)
        try {
            const moneda = fiatCurrency.toLowerCase();
            const response = await axios.get(`${this.baseUrl}/simple/price`, {
                params: {
                    ids: cryptoId, // ID de CoinGecko (ej. 'bitcoin')
                    vs_currencies: moneda // Símbolo de fiat (ej. 'usd', 'eur')
                }
            });

            // Verificar si la respuesta contiene los datos esperados
            if (!response.data || !response.data[cryptoId] || response.data[cryptoId][moneda] === undefined) {
                throw new AppError(`No se pudo obtener el precio para ${cryptoId} en ${moneda}`, 404);
            }

            const precio = response.data[cryptoId][moneda];
            const resultado = cantidadCrypto * precio;

            // isNaN es buena idea, pero también verifica si precio es null/undefined
            if (isNaN(resultado) || precio === null || precio === undefined) {
                throw new AppError(`Resultado de conversión inválido para ${cryptoId} a ${moneda}`, 400);
            }
            return resultado;
        } catch (error) {
            // Si es un AppError conocido (404, 400), re-lanzarlo. Si no, envolverlo.
            if (error instanceof AppError) {
                throw error;
            }
            console.error(`Error en conversión ${cryptoId} a ${fiatCurrency}: ${error.message}`);
            throw new AppError(error.message, error.response?.status || 505);
        }
    }
}

export default CoinGeckoAdapter;