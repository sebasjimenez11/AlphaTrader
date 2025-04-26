class CoinsController {
    constructor(coinService) {
        this.coinService = coinService;
    }

    async getCoinsList(req, res) {
        const coinsList = await this.coinService.getCoinsList();
        res.status(200).json(coinsList);
    }

    async getForeignExchangeAndListCoin(req, res) {
        const foreignExchangeAndListCoin = await this.coinService.getForeignExchangeAndListCoin();
        res.status(200).json(foreignExchangeAndListCoin);
    }

    async convertCryptoToFiat(req, res) {
        const convertCryptoToFiat = await this.coinService.convertCryptoToFiat();
        res.status(200).json(convertCryptoToFiat);
    }
}

export default CoinsController;