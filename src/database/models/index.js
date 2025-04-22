// src/database/models/index.js
import sequelize from '../../config/db.js';
import User from './user.js';
import PreferencesProfile from './preferencesProfile.js';
import PasswordResetToken from './tokensRecovery.js';

// Definir las relaciones después de que todos los modelos estén importados
const setupAssociations = () => {
    // Relación User - PreferencesProfile (uno a uno)
    User.hasOne(PreferencesProfile, {
        foreignKey: {
            name: 'userId',
            allowNull: false
        },
        as: 'preferenceProfile',
        onDelete: 'CASCADE'
    });

    PreferencesProfile.belongsTo(User, {
        foreignKey: {
            name: 'userId',
            allowNull: false
        },
        as: 'user'
    });

    // Relación User - PasswordResetToken (uno a muchos)
    User.hasMany(PasswordResetToken, {
        foreignKey: {
            name: 'userId',
            allowNull: false
        },
        as: 'passwordResetTokens',
        onDelete: 'CASCADE'
    });

    PasswordResetToken.belongsTo(User, {
        foreignKey: {
            name: 'userId',
            allowNull: false
        },
        as: 'user'
    });
};

// Configurar las asociaciones
setupAssociations();

// Exportar los modelos y la función de sincronización
export const syncModels = async (force = false) => {
    try {
        await sequelize.sync({ force });
        console.log('✅ Modelos sincronizados correctamente');
    } catch (error) {
        console.error('❌ Error al sincronizar modelos:', error);
        throw error;
    }
};

export {
    User,
    PreferencesProfile,
    PasswordResetToken
};