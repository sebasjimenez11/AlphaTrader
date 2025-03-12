import UserDto from "../dto/userDto.js";
import { generateToken } from "../utils/jwt.js";
import { getId } from "../utils/uuid.js";
import bcrypt from "bcrypt";

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async login({ Email, Password }) {
    const user = await this.userRepository.findByEmail(Email);
    if (!user || !(await bcrypt.compare(Password, user.Password))) {
      return {
        codeStatus: 404,
        status: false,
        message: "Usuario o contraseña incorrectos",
      };
    }
    return {
      codeStatus: 200,
      status: true,
      token: generateToken(user),
      message: "Usuario logueado con éxito",
    };
  }

  async findOrCreateByOAuth(data) {
    let user = await this.userRepository.findByEmail(email);
    if (!user) {
      const newUser = {
        ID: getId(),
        Email: email,
        Name: name,
        Status: !!dateOfBirth, // true si tiene fecha de nacimiento
      };
      const userDto = new UserDto(newUser);
      user = await this.userRepository.create(userDto.toJSON());
      if (!user) {
        return {
          codeStatus: 400,
          status: false,
          message: "Error al crear el usuario",
        };
      }
      return {
        codeStatus: 201,
        status: true,
        token: generateToken(user),
        message: "Usuario creado con éxito",
      };
    }
    return {
      codeStatus: 200,
      status: true,
      token: generateToken(user),
      message: "Usuario autenticado con éxito",
    };
  }
}

export default AuthService;
