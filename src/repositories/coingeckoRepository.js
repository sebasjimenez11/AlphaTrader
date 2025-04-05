import axios from "axios";
import AppError from "../utils/appError.js";

class CoingeckoRepository {
  constructor(redisRepository) {
    this.redisRepository = redisRepository;
    this.baseUrl = process.env.BASE_URL_COINGECKO; // Ejemplo: "https://api.coingecko.com/api/v3"
  }

  // Helper: esperar ms milisegundos
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


  async getBinanceCoins() {
    try {
      // Intentar obtener desde Redis
      let binanceCoins = await this.redisRepository.get('binanceCoins');
      if (binanceCoins && binanceCoins.length > 0) {
        return new Set(binanceCoins);
      }

      // Utilizamos el endpoint de Binance para obtener la información de intercambio
      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols;
      // Extraemos el campo baseAsset de cada par y lo convertimos a minúsculas para normalizar
      binanceCoins = new Set(symbols.map(item => item.baseAsset.toLowerCase()));

      // Guardamos la lista en Redis (como array) con un TTL de 1 hora (3600 segundos)
      await this.redisRepository.set('binanceCoins', Array.from(binanceCoins), 3600);
      return binanceCoins;
    } catch (e) {
      throw new AppError(`Error al obtener monedas de Binance: ${e.message}`, 505);
    }
  }


  /**
   * Obtiene la lista de monedas desde CoinGecko (market data) para la página 1.
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
        binance_symbol: (coin.symbol + 'tusd').toLowerCase(),
      }));
    } catch (error) {
      throw new AppError(`Error al obtener coins de CoinGecko: ${error.message}`, 505);
    }
  }

  /**
   * Obtiene la lista de monedas disponibles en Binance utilizando la API oficial de Binance.
   */
  async getCoinListFromBinance() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols;
      // Extraemos el baseAsset (normalizado a minúsculas)
      const assets = Array.from(new Set(symbols.map(item => item.baseAsset.toLowerCase())));
      // Mapeamos a un objeto básico (sin datos de mercado)
      return assets.map(asset => ({
        id: asset,
        symbol: asset,
        name: asset.toUpperCase(),
        image: null,
        market_cap: null,
        market_cap_rank: null,
        current_price: null,
        total_volume: null,
        high_24h: null,
        low_24h: null,
        price_change_percentage_24h: null,
        binance_symbol: (asset + 'tusd').toLowerCase(),
      }));
    } catch (error) {
      throw new AppError(`Error al obtener coins de Binance: ${error.message}`, 505);
    }
  }

  /**
   * Obtiene la lista de monedas desde CryptoCompare.
   */
  async getCoinListFromCryptoCompare() {
    try {
      const response = await axios.get('https://min-api.cryptocompare.com/data/all/coinlist');
      const data = response.data.Data;
      const coins = Object.values(data);
      return coins.map(coin => ({
        id: coin.Id ? coin.Id.toLowerCase() : coin.Symbol.toLowerCase(),
        symbol: coin.Symbol.toLowerCase(),
        name: coin.CoinName,
        image: coin.ImageUrl ? 'https://www.cryptocompare.com' + coin.ImageUrl : null,
        market_cap: null,
        market_cap_rank: null,
        current_price: null,
        total_volume: null,
        high_24h: null,
        low_24h: null,
        price_change_percentage_24h: null,
        binance_symbol: (coin.Symbol.toLowerCase() + 'tusd').toLowerCase(),
      }));
    } catch (error) {
      throw new AppError(`Error al obtener coins de CryptoCompare: ${error.message}`, 505);
    }
  }

  /**
   * Obtiene una lista de monedas disponibles combinando datos de CoinGecko, Binance y CryptoCompare.
   * Se almacena en caché en Redis por 300 segundos.
   */
  async coinsList() {
    try {
      let coins = await this.redisRepository.get('coinsList');
      if (coins && coins.length >= 250) {
        return coins;
      }

      // Ejecutar en paralelo las 3 fuentes
      const results = await Promise.allSettled([
        this.getCoinListFromCoinGecko(),
        this.getCoinListFromBinance(),
        this.getCoinListFromCryptoCompare()
      ]);

      // Unir resultados en un Map para eliminar duplicados (usando id como clave)
      const unionMap = new Map();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          for (const coin of result.value) {
            // Si ya existe, puedes actualizar o mantener el que tenga más datos, según convenga
            unionMap.set(coin.id, coin);
          }
        }
      }
      const finalList = Array.from(unionMap.values());

      // Guardar en Redis la lista unificada por 300 segundos (5 minutos)
      await this.redisRepository.set('coinsList', finalList, 300);
      return finalList;
    } catch (e) {
      throw new AppError(`Error al obtener la lista de monedas: ${e.message}`, 505);
    }
  }

  /**
   * Obtiene el ranking de las principales 10 monedas por capitalización de mercado que están disponibles en Binance.
   * Se almacena en caché en Redis por 60 segundos.
   */
  async coinsRanking() {
    try {
      let rankingCoins = await this.redisRepository.get('coinsRanking');
      if (rankingCoins && rankingCoins.length > 0) {
        return rankingCoins;
      }

      // Usamos la lista de Binance de Redis (asegúrate de guardarla correctamente)
      const binanceCoins = await this.redisRepository.get('binanceCoins');
      if (!binanceCoins || binanceCoins.length === 0) {
        throw new AppError('No se encontraron monedas de Binance', 404);
      }
      const binanceCoinsSet = new Set(binanceCoins);

      // Consultamos CoinGecko para obtener datos de mercado (ejemplo, top 50)
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 50,
          page: 1,
          sparkline: false,
        },
      });

      const coins = response.data || [];
      const filteredCoins = coins
        .filter(coin => binanceCoinsSet.has(coin.id))
        .slice(0, 10)
        .map(coin => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image,
          market_cap: coin.market_cap,
          market_cap_rank: coin.market_cap_rank,
          current_price: coin.current_price,
          total_volume: coin.total_volume,
          high_24h: coin.high_24h,
          low_24h: coin.low_24h,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          binance_symbol: (coin.symbol + 'tusd').toUpperCase()
        }));

      await this.redisRepository.set('coinsRanking', filteredCoins, 60);
      return filteredCoins;
    } catch (e) {
      throw new AppError(`Error al obtener el ranking de monedas: ${e.message}`, 505);
    }
  }

  /**
   * Obtiene información detallada de una moneda específica por su ID.
   * Primero busca en la lista almacenada en caché; si no la encuentra, consulta la API de CoinGecko.
   */
  async coinById(coinId) {
    try {
      const coinsList = await this.redisRepository.get('coinsList');
      if (coinsList && coinsList.length > 0) {
        const coinFound = coinsList.find(coin =>
          coin.id.toLowerCase() === coinId.toLowerCase()
        );
        if (coinFound) return coinFound;
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
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image?.large,
        market_cap: coin.market_data?.market_cap?.usd,
        market_cap_rank: coin.market_cap_rank,
        current_price: coin.market_data?.current_price?.usd,
        total_volume: coin.market_data?.total_volume?.usd,
        high_24h: coin.market_data?.high_24h?.usd,
        low_24h: coin.market_data?.low_24h?.usd,
        price_change_percentage_24h: coin.market_data?.price_change_percentage_24h,
      };
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  /**
   * Busca monedas por su símbolo en la lista almacenada en caché (búsqueda case-insensitive).
   */
  async coinsBySymbol(symbol) {
    try {
      const coinsList = await this.redisRepository.get('coinsList');
      if (coinsList && coinsList.length > 0) {
        return coinsList.filter(coin =>
          coin.symbol.toLowerCase().includes(symbol.toLowerCase())
        );
      } else {
        const allCoins = await this.coinsList();
        return allCoins.filter(coin =>
          coin.symbol.toLowerCase().includes(symbol.toLowerCase())
        );
      }
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  async getAllForeignExchange() {
    try {
      const foreignExchangeList = await this.redisRepository.get('foreignExchangeList');
      if (foreignExchangeList && foreignExchangeList.length > 0) {
        return foreignExchangeList;
      }
      const { data } = await axios.get('https://gist.githubusercontent.com/stevekinney/8334552/raw/currency-symbols.json');
      if (data && data.length > 0) {
        await this.redisRepository.set('foreignExchangeList', data, 3600);
        return data;
      } else {
        throw new AppError('No se encontró el recurso buscado', 404);
      }
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  async convertirCryptoAmoneda(cryptoId, fiatCurrency, cantidadCrypto) {
    try {
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: cryptoId,
          vs_currencies: fiatCurrency.toLowerCase()
        }
      });
      const precio = response.data[cryptoId][fiatCurrency];
      const resultado = cantidadCrypto * precio;
      if (isNaN(resultado)) {
        throw new AppError('Recurso no encontrado', 404);
      }
      return resultado;
    } catch (error) {
      throw new AppError(error.message, 505);
    }
  }
}

export default CoingeckoRepository;
