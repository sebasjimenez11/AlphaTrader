// src/services/userService.js
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async registerUser({ email, password, fullName, dateOfBirth, telefono }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      return {
        statusCode: 400,
        status: false,
        message: 'El usuario ya existe',
      };
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const register = await this.userRepository.create({
      Email: email,
      FullName: fullName,
      DateOfBirth: dateOfBirth,
      Status: true,
      Telefono: telefono,
      Password: hashedPassword,
    });

    if (!register) {
      return {
        statusCode: 400,
        status: false,
        message: 'Error al crear el usuario',
      };
    } else {
      return {
        statusCode: 201,
        token: generateToken(register),
        status: true,
        message: 'Usuario creado con éxito',
      };
    }
  }

  async findUserById(id) {
    return await this.userRepository.findById(id);
  }

  async completeUserProfile(email, { fullName, dateOfBirth }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    if (user.Status) {
      throw new Error('El perfil ya está completo');
    }
    user.FullName = fullName;
    user.DateOfBirth = dateOfBirth;
    user.Status = true;
    await user.save();
    return user;
  }

}

export default UserService;
