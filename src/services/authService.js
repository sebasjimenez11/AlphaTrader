// src/services/AuthService.js
import UserDto from "../dto/userDto.js";
import { generateToken } from "../utils/jwt.js";
import { getId } from "../utils/uuid.js";
import bcrypt from "bcrypt";
import AppError from "../utils/appError.js";

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async login({ Email, Password }) {
    const user = await this.userRepository.findByEmail(Email);
    if (!user || !(await bcrypt.compare(Password, user.Password))) {
      throw new AppError("Usuario o contraseña incorrectos", 404);
    }
    const token = generateToken(user);
    return { token, message: "Usuario logueado con éxito" };
  }

  async findOrCreateByOAuth(data) {
    const { email, name } = data;
    let user = await this.userRepository.findByEmail(email);
    if (!user) {
      const newUser = {
        ID: getId(),
        Email: email,
        Name: name,
        Status: true, // Se crea el usuario activo
      };

      const userDto = new UserDto(newUser);
      user = await this.userRepository.create(userDto.toJSON());

      if (!user) {
        throw new AppError("Error al crear el usuario", 400);
      }
      const token = generateToken(user);
      return { user, token, message: "Usuario creado con éxito" };
    }
    const token = generateToken(user);
    return { user, token, message: "Usuario autenticado con éxito" };
  }
}

export default AuthService;