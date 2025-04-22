// models/User.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const User = sequelize.define('User', {
  ID: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  Email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  FullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  DateOfBirth: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  Status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  Password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  DateOfRegistry: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  Telefono: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  acceptedTerms: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'default_profile_picture.png',
  },
  public_id: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'default_profile_picture',
  }
}, {
  tableName: 'users', // Especificar nombre de tabla
  timestamps: true,
  indexes: [ // Define índices para mejorar el rendimiento de las búsquedas y limpieza
    {
      fields: ['Email'], // Índice para buscar el token
      unique: true, // Asegura la unicidad a nivel de índice (además de la restricción en el campo)
    }
  ]
});

export default User;
