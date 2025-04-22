import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js'; // Asegúrate de que esta ruta sea correcta
import User from './user.js'; // Asegúrate de que esta ruta sea correcta y que User se exporte como 'User'

// Define el modelo para la tabla de Preferencias del Perfil del Usuario
const PreferencesProfile = sequelize.define('PreferencesProfile', {
    ID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
        comment: 'Unique identifier for the preferences profile', // Comentario opcional
    },
    // userId: Clave foránea para vincular a un usuario
    // Debe coincidir con el tipo de dato de la clave primaria del modelo User (User.ID)
    userId: {
        type: DataTypes.UUID, // <-- Ajusta este tipo si User.ID es INTEGER u otro tipo
        allowNull: false,
        references: { // Define la clave foránea
            model: User, // Hace referencia al modelo User
            key: 'ID',   // La columna PK en la tabla User a la que hace referencia (si tu User PK se llama 'ID')
        },
        onUpdate: 'CASCADE', // Comportamiento si el ID del usuario cambia (CASCADE, RESTRICT, SET NULL, etc.)
        onDelete: 'CASCADE',  // Comportamiento si el usuario es eliminado
        unique: true, // Añadido: Asegura que cada userId aparezca solo una vez (un usuario = un perfil)
        comment: 'Foreign key linking to the User model', // Comentario opcional
    },
    // coins: Lista de monedas de interés (JSON array)
    coins: {
        type: DataTypes.JSON, // Permite almacenar un array de strings/objetos
        allowNull: false,
        defaultValue: [], // Por defecto es un array vacío
        comment: 'List of cryptocurrencies of interest', // Comentario opcional
    },
    // RiskTolerance: Nivel de tolerancia al riesgo (ENUM)
    RiskTolerance: {
        type: DataTypes.ENUM('Bajo', 'Medio', 'Alto'),
        allowNull: false,
        defaultValue: 'Bajo',
        comment: 'User\'s risk tolerance level', // Comentario opcional
    },
    // InvestmentHorizon: Horizonte de inversión (ENUM)
    InvestmentHorizon: {
        type: DataTypes.ENUM('Corto', 'Medio', 'Largo'),
        allowNull: false,
        defaultValue: 'Corto',
        comment: 'User\'s investment horizon', // Comentario opcional
    },
    // FinancialMotivations: Motivaciones financieras (ENUM)
    FinancialMotivations: {
        type: DataTypes.ENUM('Ahorro', 'Especulación', 'Ingresos pasivos', 'Jubilación', 'Educación'),
        allowNull: false,
        defaultValue: 'Ahorro',
        comment: 'User\'s primary financial motivation', // Comentario opcional
    },
    // ExperienceInCryptomonedas: Nivel de experiencia en criptomonedas (ENUM)
    ExperienceInCryptomonedas: {
        type: DataTypes.ENUM('Ninguna', 'Baja', 'Media', 'Alta'),
        allowNull: false,
        defaultValue: 'Ninguna',
        comment: 'User\'s experience level in cryptocurrencies', // Comentario opcional
    },
    // SpecificInterest: Intereses específicos (JSON array)
    SpecificInterest: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Specific areas of interest (e.g., DeFi, NFTs)', // Comentario opcional
    },
    // created_at y updated_at son añadidos automáticamente si timestamps: true
}, {
    tableName: 'preferences_profiles',
    timestamps: true,
});

// Exportar el modelo
export default PreferencesProfile;