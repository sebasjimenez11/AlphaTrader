export default class PreferencesProfileDto {
    #ID;
    #userId;
    #coins;
    #riskTolerance;
    #investmentHorizon;
    #financialMotivations;
    #experienceInCryptomonedas;
    #specificInterest;

    /**
     * @param {Object} data - Datos del objeto PreferencesProfile
     * data debería contener:
     * {
     *    ID,
     *    userId,
     *    coins,
     *    RiskTolerance,
     *    InvestmentHorizon,
     *    FinancialMotivations,
     *    ExperienceInCryptomonedas,
     *    SpecificInterest
     * }
     */
    constructor({
        ID,
        userId,
        coins = [],
        RiskTolerance = 'Bajo',
        InvestmentHorizon = 'Corto',
        FinancialMotivations = 'Ahorro',
        ExperienceInCryptomonedas = 'Ninguna',
        SpecificInterest = []
    }) {
        this.ID = ID;
        this.userId = userId;
        this.coins = coins;
        this.riskTolerance = RiskTolerance;
        this.investmentHorizon = InvestmentHorizon;
        this.financialMotivations = FinancialMotivations;
        this.experienceInCryptomonedas = ExperienceInCryptomonedas;
        this.specificInterest = SpecificInterest;
    }

    // Getters y Setters

    get ID() {
        return this.#ID;
    }
    set ID(value) {
        this.#ID = value;
    }

    get userId() {
        return this.#userId;
    }
    set userId(value) {
        this.#userId = value;
    }

    get coins() {
        return this.#coins;
    }
    set coins(value) {
        this.#coins = value;
    }

    get riskTolerance() {
        return this.#riskTolerance;
    }
    set riskTolerance(value) {
        this.#riskTolerance = value;
    }

    get investmentHorizon() {
        return this.#investmentHorizon;
    }
    set investmentHorizon(value) {
        this.#investmentHorizon = value;
    }

    get financialMotivations() {
        return this.#financialMotivations;
    }
    set financialMotivations(value) {
        this.#financialMotivations = value;
    }

    get experienceInCryptomonedas() {
        return this.#experienceInCryptomonedas;
    }
    set experienceInCryptomonedas(value) {
        this.#experienceInCryptomonedas = value;
    }

    get specificInterest() {
        return this.#specificInterest;
    }
    set specificInterest(value) {
        this.#specificInterest = value;
    }

    /**
     * Método para convertir el DTO a un objeto JSON
     * @returns {Object} Representación JSON del DTO
     */
    toJSON() {
        return {
            ID: this.ID,
            userId: this.userId,
            coins: this.coins,
            RiskTolerance: this.riskTolerance,
            InvestmentHorizon: this.investmentHorizon,
            FinancialMotivations: this.financialMotivations,
            ExperienceInCryptomonedas: this.experienceInCryptomonedas,
            SpecificInterest: this.specificInterest,
        };
    }
}
