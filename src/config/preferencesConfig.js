/**
 * Configuration data for User Preferences Profile.
 * Centralizes values for ENUM types and potential values for JSON fields.
 * Useful for validation, frontend display, etc.
 */

// --- ENUM Options ---

/**
 * Possible values for the 'RiskTolerance' field.
 */
const riskToleranceOptions = ['Bajo', 'Medio', 'Alto'];

/**
 * Possible values for the 'InvestmentHorizon' field.
 */
const investmentHorizonOptions = ['Corto', 'Medio', 'Largo'];

/**
 * Possible values for the 'FinancialMotivations' field.
 */
const financialMotivationsOptions = [
    'Ahorro',
    'Especulación',
    'Ingresos pasivos',
    'Jubilación',
    'Educación',
];

/**
 * Possible values for the 'ExperienceInCryptomonedas' field.
 */
const experienceOptions = ['Ninguna', 'Baja', 'Media', 'Alta'];


// --- JSON Array Potential Values (Examples) ---

/**
 * Example list of specific areas of interest within the crypto space.
 * Useful for tagging user interests or filtering content.
 */
const specificInterestList = [
    'DeFi (Finanzas Descentralizadas)',
    'NFTs (Tokens No Fungibles)',
    'Staking',
    'Yield Farming',
    'Trading',
    'Inversión a Largo Plazo',
    'Minería',
    'Web3',
    'Metaverso',
    'Trading Algorítmico',
    'Contratos Inteligentes',
    'Soluciones de Capa 2',
    'DAOs (Organizaciones Autónomas Descentralizadas)',
    'Seguridad Blockchain',
    'Auditoría de Contratos Inteligentes',
    'Gaming Crypto / Play-to-Earn',
    'Regulación y Cumplimiento',
];


export {
    riskToleranceOptions,
    investmentHorizonOptions,
    financialMotivationsOptions,
    experienceOptions,
    specificInterestList,
};