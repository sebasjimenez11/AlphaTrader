import axios from "axios";
import AppError from "../utils/appError.js";
import { formatCoinData } from "../utils/coinDataFormatter.js";

class CoinGeckoAdapter {
  constructor(redisRepository) {
    this.redisRepository = redisRepository;
    this.baseUrl = process.env.BASE_URL_COINGECKO; // Ejemplo: "https://api.coingecko.com/api/v3"
  }

  // Helper: esperar ms milisegundos
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


  async getBinanceCoins() {
    try {
      // Intentar obtener desde Redis
      // NOTA: Si estás seguro de que la data de Redis está dañada,
      // puedes comentar temporalmente esta sección para forzar la obtención desde la API
      let binanceCoins = await this.redisRepository.get('binanceCoins');
      if (binanceCoins && Array.isArray(binanceCoins) && binanceCoins.length > 0) {
        return new Set(binanceCoins);
      }

      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols;
      // Extraemos el campo baseAsset de cada par y lo convertimos a minúsculas para normalizar
      binanceCoins = new Set(symbols.map(item => item.baseAsset.toLowerCase()));

      // Guardamos la lista en Redis (como array) con un TTL de 1 hora (3600 segundos)
      await this.redisRepository.set('binanceCoins', Array.from(binanceCoins), 3600);
      return binanceCoins;
    } catch (e) {
      console.error("Error in getBinanceCoins:", e.message, e.stack);
      // Decide si quieres lanzar el error o retornar un Set vacío para permitir que coinsList continúe
      // Lanzar el error es más estricto. Retornar vacío permite que coinsList intente con CoinGecko.
      // throw new AppError(`Error al obtener monedas de Binance: ${e.message}`, 505);
      console.warn("Returning empty Set for Binance coins due to error");
      return new Set(); // Return empty set on error
    }
  }


  /**
   * Obtiene la lista de monedas desde CoinGecko (market data) para la página 1.
   * Retorna datos crudos, formatCoinData se aplica en coinsList.
   */
  async getCoinListFromCoinGecko() {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
        },
      });
      // Retorna los datos mapeados directamente, formatCoinData se aplicará después
      return response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        image: coin.image,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        current_price: coin.current_price,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        // binance_symbol derivado aquí si no está en CoinGecko data (raro) o si formatCoinData no lo maneja
        // Es mejor dejar que formatCoinData lo maneje para consistencia si es posible
        // binance_symbol: (coin.symbol + 'usdt').toLowerCase(),
      }));
    } catch (error) {
      console.error("Error in getCoinListFromCoinGecko:", error.message, error.stack);
      // Decide si lanzar el error o retornar un array vacío
      // throw new AppError(`Error al obtener coins de CoinGecko: ${error.message}`, 505);
      console.warn("Returning empty array for CoinGecko coins due to error");
      return []; // Return empty array on error
    }
  }

  /**
   * Obtiene la lista de monedas disponibles en Binance utilizando la API oficial de Binance.
   * Retorna datos crudos, formatCoinData se aplica en coinsList.
   */
  async getCoinListFromBinance() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols;
      const assets = Array.from(new Set(symbols.map(item => item.baseAsset.toLowerCase())));
      // Retorna los datos mapeados directamente, NO llama formatCoinData aquí
      const list = assets.map(asset => {
        const coin = {
          id: asset, // Usando asset como id para coins solo en Binance
          symbol: asset,
          name: asset.toUpperCase(), // Binance list podría no tener nombres, usa símbolo en mayúsculas
          image: null,
          market_cap: null,
          market_cap_rank: null,
          current_price: null,
          total_volume: null,
          high_24h: null,
          low_24h: null,
          price_change_percentage_24h: null,
          binance_symbol: (asset + "USDT").toUpperCase() // Símbolo de Binance se deriva aquí
        };
        return coin; // Retorna el objeto crudo
      });
      return list;
    } catch (error) {
      console.error("Error in getCoinListFromBinance:", error.message, error.stack);
      // Decide si lanzar el error o retornar un array vacío
      // throw new AppError(`Error al obtener coins de Binance: ${error.message}`, 505);
      console.warn("Returning empty array for Binance assets due to error");
      return []; // Return empty array on error
    }
  }

  /**
   * Obtiene el ranking de las principales 20 monedas por capitalización de mercado.
   * Se almacena en caché en Redis por 60 segundos.
   * NOTA: Se ha eliminado el método 'coinsRanking' duplicado.
   */
  async coinsRanking() {
    try {
      // Check cache first
      let rankingCoins = await this.redisRepository.get('coinsRanking');
      if (rankingCoins && Array.isArray(rankingCoins) && rankingCoins.length > 0) {
        // Asume que la data en cache ya está formateada con 'symbolo'
        // Si tu formatCoinData cambia 'symbol' a 'symbolo', esta validación es útil
        if (rankingCoins[0] && rankingCoins[0].hasOwnProperty('symbolo')) {
          return rankingCoins;
        } else {
          // Si por alguna razón la cache no está formateada, la formateamos antes de retornar
          console.warn("Cache de ranking encontrada pero no formateada, formateando ahora.");
          const formattedRanking = rankingCoins.map(coin => formatCoinData(coin));
          // Opcional: re-cachear la versión formateada aquí si quieres asegurar que la cache siempre esté lista
          // await this.redisRepository.set('coinsRanking', formattedRanking, 60);
          return formattedRanking;
        }
      }

      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 50, // Fetching 50 to get top 20
          page: 1,
          sparkline: false,
        },
      });

      const coins = response.data || [];
      // Toma los top 20 y aplica formatCoinData
      const filteredCoins = coins.slice(0, 20).map(coin => formatCoinData(coin));

      // Cachea la lista formateada
      await this.redisRepository.set('coinsRanking', filteredCoins, 60);
      return filteredCoins;
    } catch (e) {
      console.error("Error in coinsRanking:", e.message, e.stack);
      throw new AppError(`Error al obtener el ranking de monedas: ${e.message}`, 505);
    }
  }


  /**
   * Obtiene una lista de monedas disponibles combinando datos de CoinGecko y Binance.
   * formatCoinData se aplica aquí.
   * Se almacena en caché en Redis por 300 segundos.
   */
  async coinsList() {
    try {
      // Check cache first
      // Comenta temporalmente esta sección si la cache está dañada y quieres forzar la obtención desde APIs
      let coins = await this.redisRepository.get('coinsList');
      if (coins && Array.isArray(coins) && coins.length > 0) {
        // Verifica si la data en cache parece formateada
        if (coins[0] && coins[0].hasOwnProperty('symbolo')) { // Asumiendo que formatCoinData agrega 'symbolo'
          return coins;
        } else {
          // Si la cache no está formateada, loguea una advertencia y fuerza la obtención desde APIs
          console.warn("Cache de coinsList encontrada pero no formateada, forzando obtención desde APIs.");
          coins = null; // Ignora la cache no formateada
        }
      }

      // Si no hay cache válida, obtiene de las fuentes
      if (!coins) {
        const results = await Promise.allSettled([
          this.getCoinListFromCoinGecko(), // Retorna data cruda
          this.getCoinListFromBinance()   // Retorna data cruda
        ]);

        const unionMap = new Map();
        let processedCount = 0;

        for (const result of results) {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            result.value.forEach(coin => {
              // === Lógica Central de Formateo y Adición ===
              let formattedCoin = null;
              try {
                // Aplicar formatCoinData con manejo de errores por si falla para alguna coin
                formattedCoin = formatCoinData(coin);

                // Verifica que el resultado formateado sea un objeto válido con una ID
                if (formattedCoin && typeof formattedCoin === 'object' && formattedCoin.Id) {
                  unionMap.set(formattedCoin.Id, formattedCoin);
                  processedCount++;
                } else {
                  // Log si formatCoinData no produjo un objeto válido o sin ID
                  console.warn(`formatCoinData no produjo objeto válido con Id para coin:`, coin, `Resultado:`, formattedCoin);
                  // Opcional: si quieres agregarla con la ID original pero sin formatear si falla
                  // if(coin.id) { unionMap.set(coin.id, coin); processedCount++; }
                }
              } catch (formatError) {
                // Log si formatCoinData lanza un error para una coin específica
                console.error(`Error formateando coin ${coin?.id || coin?.symbol || 'unknown'}:`, formatError.message);
              }
              // === Fin Lógica Central ===
            });
          } else if (result.status === 'rejected') {
            console.error('Una fuente de datos fue rechazada:', result.reason);
            // El Promise.allSettled asegura que la promesa no se rompa si una fuente falla
          }
        }

        const finalList = Array.from(unionMap.values());

        // Cachea la lista final, formateada
        if (finalList.length > 0) {
          await this.redisRepository.set('coinsList', finalList, 300);
        } else {
          console.warn("La lista final está vacía, no se guardará en Redis.");
          // Considerar qué hacer si la lista final está vacía - lanzar un error? retornar []?
          // Retornar [] es lo que el código actual haría, y es razonable si ambas APIs fallaron.
        }
        coins = finalList; // Asigna la lista generada para el retorno
      }

      return coins; // Retorna la lista obtenida de cache o generada
    } catch (e) {
      console.error("Error general in coinsList:", e.message, e.stack);
      // Captura errores generales durante el proceso (ej. problema con Redis después de obtener data)
      throw new AppError(`Error al obtener la lista de monedas: ${e.message}`, 505);
    }
  }


  /**
   * Obtiene información detallada de una moneda específica por su ID.
   * Primero busca en la lista almacenada en caché; si no la encuentra, consulta la API de CoinGecko.
   */
  async coinById(coinId) {
    try {
      // Obtiene la lista completa de coins (que debe estar formateada)
      // Llama a coinsList para asegurar que se obtiene la versión más reciente (cacheada o generada)
      const coinsList = await this.coinsList();

      if (coinsList && Array.isArray(coinsList) && coinsList.length > 0) {
        // Busca en el array. Asumiendo que formatCoinData usa una propiedad llamada 'Id'.
        const foundCoin = coinsList.find(coin =>
          coin && coin.Id && coin.Id.toLowerCase() === coinId.toLowerCase()
        );
        if (foundCoin) {
          return foundCoin;
        }
      }

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
      const coin = response.data;
      // Asegura que el binance_symbol se añada si no existe (o confía en formatCoinData)
      if (!coin.binance_symbol && coin.symbol) {
        coin.binance_symbol = (coin.symbol + "USDT").toUpperCase();
      }
      // Aplica formatCoinData a la coin individual obtenida de la API
      const formattedCoin = formatCoinData(coin);
      return formattedCoin;
    } catch (e) {
      console.error(`Error in coinById(${coinId}):`, e.message, e.stack);
      // Si la llamada a la API falla (ej. 404 Not Found), atrapamos el error
      if (axios.isAxiosError(e) && e.response && e.response.status === 404) {
        throw new AppError(`Coin with ID '${coinId}' not found`, 404);
      }
      // Si formatCoinData lanza un error
      if (e instanceof Error && e.message.includes("formatCoinData")) { // Ajusta si tu error de formato es diferente
        throw new AppError(`Error formatting data for coin '${coinId}': ${e.message}`, 500); // O un código apropiado
      }
      throw new AppError(`Error al obtener detalles de la moneda '${coinId}': ${e.message}`, 505);
    }
  }

  /**
   * Busca monedas por su símbolo en la lista almacenada en caché (búsqueda case-insensitive).
   */
  async coinsBySymbol(symbol) {
    try {
      // Obtiene la lista completa de coins (que debe estar formateada)
      const coinsList = await this.coinsList();

      let filtered = [];
      if (coinsList && Array.isArray(coinsList) && coinsList.length > 0) {
        // Filtra el array. Usando la propiedad 'symbolo' que formatCoinData parece crear/usar.
        // NOTA IMPORTANTE: Verifica en tu archivo formatCoinData.js si realmente cambia 'symbol' a 'symbolo'.
        // Si no lo hace, deberías usar 'coin.symbol' aquí. Asumo 'symbolo' por tu código anterior.
        filtered = coinsList.filter(coin =>
          coin && coin.symbolo && typeof coin.symbolo === 'string' && coin.symbolo.toLowerCase().includes(symbol.toLowerCase())
        );
      } 

      // arrayToObjectByKey espera un array y lo convierte.
      return arrayToObjectByKey(filtered); // Asumiendo que arrayToObjectByKey funciona correctamente
    } catch (e) {
      console.error(`Error in coinsBySymbol(${symbol}):`, e.message, e.stack);
      throw new AppError(`Error al buscar monedas por símbolo '${symbol}': ${e.message}`, 505);
    }
  }


  async getAllForeignExchange() {
    try {
      const foreignExchangeList = await this.redisRepository.get('foreignExchangeList');
      if (foreignExchangeList && Array.isArray(foreignExchangeList) && foreignExchangeList.length > 0) {
        return foreignExchangeList;
      }
      const { data } = await axios.get('https://gist.githubusercontent.com/stevekinney/8334552/raw/currency-symbols.json');
      if (data && Array.isArray(data) && data.length > 0) {
        await this.redisRepository.set('foreignExchangeList', data, 3600);
        return data;
      } else {
        console.warn("Gist de cambio de divisas vacío o inválido.");
        throw new AppError('No se encontró el recurso buscado (lista de cambio de divisas)', 404);
      }
    } catch (e) {
      console.error("Error in getAllForeignExchange:", e.message, e.stack);
      throw new AppError(`Error fetching foreign exchange list: ${e.message}`, 505);
    }
  }

  async convertirCryptoAmoneda(cryptoId, fiatCurrency, cantidadCrypto) {
    try {
      const moneda = fiatCurrency.toLowerCase();
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: cryptoId,
          vs_currencies: moneda
        }
      });

      // Verifica que la respuesta contenga los datos esperados
      if (!response.data || !response.data[cryptoId] || response.data[cryptoId][moneda] === undefined) {
        console.warn(`No se encontró precio para ${cryptoId} en ${fiatCurrency}. Response data:`, response.data);
        throw new AppError(`Could not find price for crypto ID '${cryptoId}' in currency '${fiatCurrency}'`, 404);
      }

      const precio = response.data[cryptoId][moneda];
      const resultado = cantidadCrypto * precio;

      return resultado;
    } catch (error) {
      console.error("Error in convertirCryptoAmoneda:", error.message, error.stack);
      // Manejo de errores Axios
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Errores de respuesta HTTP (ej. 404 de CoinGecko si la coin/moneda no existe)
          throw new AppError(`API Error converting crypto: ${error.response.status} ${error.response.statusText} - ${error.message}`, error.response.status);
        } else if (error.request) {
          // Error de red (no se recibió respuesta)
          throw new AppError(`Network Error converting crypto: ${error.message}`, 500); // O un código apropiado
        } else {
          // Algo pasó al configurar la petición
          throw new AppError(`Request Setup Error converting crypto: ${error.message}`, 500);
        }
      }
      // Si es nuestro custom AppError desde el check 404 de arriba, lo relanza
      if (error instanceof AppError) {
        throw error;
      }
      // Manejo de errores generales no previstos
      throw new AppError(`Error converting crypto to fiat: ${error.message}`, 505);
    }
  }
}

export default CoinGeckoAdapter;