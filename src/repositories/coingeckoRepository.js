import axios from "axios";
import AppError from "../utils/appError.js";

class CoingeckoRepository {
  constructor(redisRepository) {
    this.redisRepository = redisRepository;
    // URL base de la API de CoinGecko
    this.baseUrl = process.env.BASE_URL_COINGECKO;
  }

  /**
   * Obtiene la lista completa de coins (datos de mercado relevantes)
   * La lista se cachea en Redis por 5 minutos (300 segundos)
   */
  async coinsList() {
    try {
      let coins = await this.redisRepository.get('coinsList');
      if (coins && coins.length > 0) {
        return coins;
      }

      const listCoins = [];
      let page = 1;
      let responseCoins = [];

      do {
        const response = await axios.get(`${this.baseUrl}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: page,
            sparkline: false,
          },
        });
        responseCoins = response.data;

        if (responseCoins.length > 0) {
          listCoins.push(
            ...responseCoins.map(coin => ({
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
            }))
          );
        }
        page++;
      } while (responseCoins.length !== 0);

      // Guardar en Redis con TTL de 300 segundos
      await this.redisRepository.set('coinsList', listCoins, 300);
      return listCoins;
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  /**
   * Obtiene el ranking de coins (top 10 por capitalización)
   * La data se cachea en Redis por 60 segundos
   */
  async coinsRanking() {
    try {
      let rankingCoins = await this.redisRepository.get('coinsRanking');
      if (rankingCoins && rankingCoins.length > 0) {
        return rankingCoins;
      }

      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 10,
          page: 1,
          sparkline: false,
        },
      });

      const coins = response.data || [];
      rankingCoins = coins.map(coin => ({
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
      }));

      // Guardar el ranking en Redis con TTL de 60 segundos
      await this.redisRepository.set('coinsRanking', rankingCoins, 60);
      return rankingCoins;
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  /**
   * Consulta una coin individual utilizando su ID.
   * Si no se encuentra en la lista cacheada, realiza la consulta a la API.
   */
  async coinById(coinId) {
    try {
      // Primero intenta buscar en la lista cacheada
      const coinsList = await this.redisRepository.get('coinsList');
      if (coinsList && coinsList.length > 0) {
        const coinFound = coinsList.find(coin =>
          coin.id.toLowerCase() === coinId.toLowerCase()
        );
        if (coinFound) return coinFound;
      }

      // Si no se encuentra, consulta directamente la API
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
      // Extraer solo los datos relevantes
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image?.large, // puedes elegir thumb, small o large
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
   * Busca coins por símbolo en la lista almacenada en Redis.
   * Se realiza una búsqueda case-insensitive.
   */
  async coinsBySymbol(symbol) {
    try {
      const coinsList = await this.redisRepository.get('coinsList');
      if (coinsList && coinsList.length > 0) {
        const filteredCoins = coinsList.filter(coin =>
          coin.symbol.toLowerCase().includes(symbol.toLowerCase())
        );
        return filteredCoins;
      } else {
        // Si no hay lista en cache, se puede llamar a coinsList para cargarla
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
      // Intentamos obtener la lista desde Redis de forma asíncrona.
      const foreignExchangeList = await this.redisRepository.get('foreignExchangeList');
      if (foreignExchangeList && foreignExchangeList.length > 0) {
        return foreignExchangeList;
      }

      // Si no se encuentra en cache, se consulta la API externa
      const { data } = await axios.get('https://gist.githubusercontent.com/stevekinney/8334552/raw/currency-symbols.json');
      if (data && data.length > 0) {
        // Guardamos en Redis; el TTL se puede agregar si se desea, por ejemplo, 3600 segundos (1 hora)
        await this.redisRepository.set('foreignExchangeList', data, 3600);
        return data;
      } else
        throw new AppError('No se encontro el recurso buscado', 404);
    } catch (e) {
      throw new AppError(e.message, 505);
    }
  }

  async convertirCryptoAmoneda(cryptoId, fiatCurrency, cantidadCrypto) {
    try {
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: cryptoId,              // Ej: 'bitcoin'
          vs_currencies: fiatCurrency.toLowerCase() // Ej: 'usd'
        }
      });

      const precio = response.data[cryptoId][fiatCurrency];
      const resultado = cantidadCrypto * precio;
      if (isNaN)
        throw AppError('Recurso no encontrado')
      return resultado;
    } catch (error) {
      throw new AppError(error.message, 505);
    }
  }
}

export default CoingeckoRepository;
