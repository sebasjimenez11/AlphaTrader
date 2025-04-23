import * as config from '../config/preferencesConfig.js';
import * as validator from '../utils/generateValidators.js'

export const validateCreateProfile = [
    validator.validateIsArray('coins'),
    validator.validateInEnum('RiskTolerance', config.riskToleranceOptions),
    validator.validateInEnum('InvestmentHorizon', config.investmentHorizonOptions),
    validator.validateInEnum('FinancialMotivations', config.financialMotivationsOptions),
    validator.validateInEnum('ExperienceInCryptomonedas', config.experienceOptions),
    validator.validateFieldArray('SpecificInterest', config.specificInterestList)
];



