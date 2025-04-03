// src/services/userService.js
import { generateToken } from '../utils/jwt.js';
import generateHash from '../utils/generateHash.js';
import AppError from '../utils/appError.js';

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async registerUser({ Email, Password, FullName, DateOfBirth, Telefono, acceptedTerms }) {
    const existingUser = await this.userRepository.findByEmail(Email);
    if (existingUser) {
      throw new AppError('El usuario ya existe', 400);
    }
    const hashedPassword = await generateHash(Password);
    const user = await this.userRepository.create({
      Email,
      FullName,
      DateOfBirth,
      Telefono,
      Password: hashedPassword,
      acceptedTerms,
      Status: true
    });
    if (!user) {
      throw new AppError('Error al crear el usuario', 400);
    }
    const token = generateToken(user);
    return { token };
  }

  async completeUserProfile(email, { fullName, dateOfBirth }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    if (user.Status) {
      throw new AppError('El perfil ya está completo', 400);
    }

    user.DateOfBirth = dateOfBirth;
    
    user.Status = true;
    await user.save();
    return user;
  }
}

export default UserService;
