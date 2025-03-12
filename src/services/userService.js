// src/services/userService.js
import bcrypt from 'bcrypt';
import { getId } from '../utils/uuid';

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async registerUser({ email, password, fullName, dateOfBirth }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return await this.userRepository.create({
      Email: email,
      FullName: fullName,
      DateOfBirth: dateOfBirth,
      Status: true,
      Password: hashedPassword,
    });
  }

  async loginUser({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      throw new Error('Contraseña incorrecta');
    }
    return user;
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
