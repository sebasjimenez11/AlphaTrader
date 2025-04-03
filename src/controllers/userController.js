// src/controllers/userController.js
import UserDto from '../dto/userDto.js';

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async register(req, res, next) {
    const userDto = new UserDto(req.body);
    const { user, token } = await this.userService.registerUser(userDto.toJSON());
    res.status(201).json({ status: true, user, token });
  }

  async completeProfile(req, res, next) {
    // Suponiendo que el email viene autenticado en req.user
    const { email } = req.user;
    const { fullName, dateOfBirth } = req.body;
    const updatedUser = await this.userService.completeUserProfile(email, { fullName, dateOfBirth });
    res.json({ status: true, user: updatedUser });
  }
}

export default UserController;
