import axios from "axios";
import AppError from "../utils/appError.js";
import { formatCoinData, arrayToObjectByKey } from "../utils/coinDataFormatter.js";
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
        binance_symbol: (coin.symbol + 'usdt').toLowerCase(),
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
      const assets = Array.from(new Set(symbols.map(item => item.baseAsset.toLowerCase())));
      const list = assets.map(asset => {
        const coin = {
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
          binance_symbol: (asset + "USDT").toUpperCase()
        };
        return formatCoinData(coin);
      });
      return list;
    } catch (error) {
      throw new AppError(`Error al obtener coins de Binance: ${error.message}`, 505);
    }
  }

  /**
   * Obtiene la lista de monedas desde CryptoCompare.
   */
  async coinsRanking() {
    try {
      let rankingCoins = await this.redisRepository.get('coinsRanking');
      if (rankingCoins && Array.isArray(rankingCoins) && rankingCoins.length > 0) {
        return rankingCoins;
      }

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
      const filteredCoins = coins.slice(0, 20).map(coin => formatCoinData(coin));

      await this.redisRepository.set('coinsRanking', filteredCoins, 60);
      return filteredCoins;
    } catch (e) {
      throw new AppError(`Error al obtener el ranking de monedas: ${e.message}`, 505);
    }
  }

  /**
   * Obtiene una lista de monedas disponibles combinando datos de CoinGecko, Binance y CryptoCompare.
   * Se almacena en caché en Redis por 300 segundos.
   */
  async coinsList() {
    try {
      let coins = await this.redisRepository.get('coinsList');
      if (coins && Array.isArray(coins) && coins.length >= 250) {
        return coins;
      }

      const results = await Promise.allSettled([
        this.getCoinListFromCoinGecko(),
        this.getCoinListFromBinance()
      ]);

      const unionMap = new Map();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          result.value.forEach(coin => {
            unionMap.set(coin.id, formatCoinData(coin));
          });
        }
      }
      const finalList = Array.from(unionMap.values());
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
        .slice(0, 20)
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
          binance_symbol: (coin.symbol + 'usdt').toUpperCase()
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
      if (coinsList && Object.keys(coinsList).length > 0) {
        // Como coinsList es ahora un objeto de objetos, se itera para encontrar la coin
        for (const key in coinsList) {
          if (coinsList[key].Id.toLowerCase() === coinId.toLowerCase()) {
            return coinsList[key];
          }
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
      // Aseguramos el símbolo de Binance
      coin.binance_symbol = (coin.symbol + "USDT").toUpperCase();
      return formatCoinData(coin);
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
      let filtered;
      if (coinsList && Object.keys(coinsList).length > 0) {
        filtered = Object.values(coinsList).filter(coin =>
          coin.symbolo.toLowerCase().includes(symbol.toLowerCase())
        );
      } else {
        const allCoins = await this.coinsList();
        filtered = Object.values(allCoins).filter(coin =>
          coin.symbolo.toLowerCase().includes(symbol.toLowerCase())
        );
      }
      return arrayToObjectByKey(filtered);
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
      const moneda = fiatCurrency.toLowerCase();
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: cryptoId,
          vs_currencies: moneda
        }
      });
      const precio = response.data[cryptoId][moneda];
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
