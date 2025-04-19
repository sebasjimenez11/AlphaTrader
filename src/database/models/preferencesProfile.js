import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';
import { User } from './user.js';

const PreferencesProfile = sequelize.define('PreferencesProfile', {
    ID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'ID'
        }
    },
    coins: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    RiskTolerance: {
        type: DataTypes.ENUM('Bajo', 'Medio', 'Alto'),
        allowNull: false,
        defaultValue: 'Bajo'
    },
    InvestmentHorizon: {
        type: DataTypes.ENUM('Corto', 'Medio', 'Largo'),
        allowNull: false,
        defaultValue: 'Corto'
    },
    FinancialMotivations: {
        type: DataTypes.ENUM('Ahorro', 'Especulación', 'Ingresos pasivos', 'Jubilación', 'Educación'),
        allowNull: false,
        defaultValue: 'Ahorro'
    },
    ExperienceInCryptomonedas: {
        type: DataTypes.ENUM('Ninguna', 'Baja', 'Media', 'Alta'),
        allowNull: false,
        defaultValue: 'Ninguna'
    },
    SpecificInterest: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    }
});

// Relaciones de los modelos
User.hasOne(PreferencesProfile, {
    foreignKey: 'userId'
});

PreferencesProfile.belongsTo(User, {
    foreignKey: 'userId'
});

export default PreferencesProfile;