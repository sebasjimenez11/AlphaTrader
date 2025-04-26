class CoinService {
  constructor(coinGeckoAdapter) {
    this.coinGeckoAdapter = coinGeckoAdapter;
  }

   async getCoinsList() {
        const coinList = await this.CoinGeckoAdapter.coinsList();
        if (!coinList) {
            throw new AppError('Error al obtener la lista de monedas', 500);
        }
        
        const coins = coinList.map(coin => ({
            name: coin.name,
            symbol: coin.symbol,
            id: coin.id
        }));

        return {
            status: true,
            message: 'Lista de monedas obtenida correctamente',
            data: coins
        };
    }

   // Asumiendo que este método está dentro de una clase que tiene
// this.CoinGeckoAdap como una instancia de CoinGeckoAdapter

async getForeignExchangeAndListCoin() {
    try {
        const coinListPromise = this.CoinGeckoAdap.coinsList(); // Llama al método del adaptador
        const foreignExchangePromise = this.CoinGeckoAdap.getAllForeignExchange();

        const [coinListResult, foreignExchangeResult] = await Promise.all([
            coinListPromise,
            foreignExchangePromise
        ]);

        // Verificar los resultados (pueden ser null o arrays vacíos si las funciones internas manejan errores así)
        if (!coinListResult || coinListResult.length === 0) {
             console.warn("coinsList devolvió vacío o null.");
        }

        const coinsList = coinListResult.map(coin => ({
            name: coin.name,
            symbol: coin.symbol,
            id: coin.id
        }));
         if (!foreignExchangeResult || foreignExchangeResult.length === 0) {
             console.warn("getAllForeignExchange devolvió vacío o null.");
              throw new AppError('Error al obtener el tipo de cambio (resultado vacío/null)', 500);
         }

        // Devolver ambos resultados en una estructura clara
        return {
            status: true,
            message: 'Datos de monedas y divisas obtenidos correctamente',
            data: {
                coins: coinListResult,         // Array de monedas
                foreignExchanges: foreignExchangeResult // Array de divisas
            }
        };

    } catch (error) {
        console.error("Error en getForeignExchangeAndListCoin (Promise.all o posterior):", error);
        if (error instanceof AppError) {
            throw error; // Propagar el error específico
        } else {
            // Envolver otros errores
            throw new AppError(`Error al obtener datos combinados: ${error.message}`, 500);
        }
    }
}

    async convertCryptoToFiat(cryptoId, fiatCurrency, amount) {
        const convertedAmount = await this.coinGeckoAdapter.convertCryptoToFiat(cryptoId, fiatCurrency, amount);
        if (!convertedAmount) {
            throw new AppError('Error al convertir la criptomoneda a fiat', 500);
        }
        return {
            status: true,
            message: 'Conversión realizada correctamente',
            data: convertedAmount
        };
    }
}



export default CoinService;