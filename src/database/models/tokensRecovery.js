import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js'; // Asegúrate de que esta ruta sea correcta
import { User } from './user.js'; // Asegúrate de que esta ruta sea correcta y exporte 'User'

// Define el modelo para la tabla 'password_reset_tokens'
const PasswordResetToken = sequelize.define('PasswordResetToken', {
    // Campo 'id': Primary Key autoincremental por defecto manejada por Sequelize.
    // Si necesitas un ID diferente (ej. UUID), puedes definirlo aquí explícitamente:
    id: {
        type: DataTypes.UUID, // O DataTypes.INTEGER, etc.
        defaultValue: DataTypes.UUIDV4, // O DataTypes.INTEGER, autoIncrement: true, primaryKey: true
        primaryKey: true,
        allowNull: false,
    },
    token: { // El token generado aleatoriamente (el string)
        type: DataTypes.TEXT, // STRING con una longitud razonable. Puedes usar DataTypes.TEXT si es necesario.
        allowNull: false,
        unique: true, // Asegura que cada token sea único
        comment: 'The unique token string for password reset', // Pequeño comentario opcional
    },

    userId: { // Clave foránea para vincular al usuario
        // Importante: El tipo de dato debe coincidir con el tipo de la clave primaria de tu modelo User (User.ID o User.id)
        type: DataTypes.UUID, // <-- Ajusta si User.PK es INTEGER, BIGINT, etc.
        allowNull: false,
        references: {
            model: User, // Nombre del modelo referenciado
            key: 'ID',   // Nombre de la columna PK en el modelo referenciado (si es diferente de 'id')
        },
        onUpdate: 'CASCADE', // Comportamiento si el ID del usuario referenciado cambia
        onDelete: 'CASCADE',  // Comportamiento si el usuario referenciado es eliminado
        comment: 'The ID of the user this token belongs to', // Comentario opcional
    },

    expiresAt: { // Fecha y hora de expiración del token
        type: DataTypes.DATE, // Almacena timestamp completo con zona horaria (TIMESTAMP WITH TIME ZONE en algunos SQL)
        allowNull: false,
        comment: 'The timestamp when the token expires', // Comentario opcional
    },
    createdAt: { // Campo de creación automática
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'The timestamp when the token was created', // Comentario opcional
    },
    updatedAt: { // Campo de actualización automática
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Default para creación inicial
        onUpdate: DataTypes.NOW,     // Actualizar en cada cambio
        comment: 'The timestamp when the token was last updated', // Comentario opcional
    },
    isUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the token has been used (as an alternative to deletion)',
    },
    isInvalid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the token has been invalidated (as an alternative to deletion)',
    },
   

}, {
    // Opciones del modelo
    sequelize, // Pasa la instancia de conexión
    modelName: 'PasswordResetToken', // Nombre del modelo
    tableName: 'password_reset_tokens', // Nombre explícito de la tabla en la base de datos
    timestamps: true, // Activa los campos `createdAt` y `updatedAt` automáticos
    underscored: true, // Usa nombres de columna en snake_case para los campos automáticos y foreign keys (ej: user_id, created_at)

    indexes: [ // Define índices para mejorar el rendimiento de las búsquedas y limpieza
        {
            fields: ['token'], // Índice para buscar el token
            unique: true, // Asegura la unicidad a nivel de índice (además de la restricción en el campo)
        },
        {
            fields: ['expires_at'], // Índice para buscar tokens expirados (para limpieza o consultas)
        },
         {
             fields: ['user_id'], // Índice para buscar tokens por usuario
         }
    ]
});

// Definir la relación a nivel de modelo
// PasswordResetToken pertenece a un User
PasswordResetToken.belongsTo(User, {
    foreignKey: 'userId', // La columna en ESTA tabla (password_reset_tokens)
    targetKey: 'ID',      // La columna en la tabla User a la que userId referencia (si User.PK se llama 'ID')
    as: 'user',           // Alias para incluir la relación (ej: include: 'user')
});

User.hasMany(PasswordResetToken, {
    foreignKey: 'userId', // La columna en la tabla referenciada (password_reset_tokens)
    sourceKey: 'ID',      // La columna en la tabla User que se usa en la relación (si User.PK se llama 'ID')
    as: 'passwordResetTokens', // Alias para incluir los tokens desde una instancia de usuario (ej: user.getPasswordResetTokens())
});


// Exportar el modelo
export default PasswordResetToken;