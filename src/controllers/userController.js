// src/controllers/userController.js
import UserDto from '../dto/userDto.js';

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async register(req, res) {
    const userDto = new UserDto(req.body);
    const { user, token } = await this.userService.registerUser(userDto.toJSON());
    res.status(201).json({ status: true, user, token });
  }

  async completeProfile(req, res) {
    const { tokenId: Id } = req;
    const updatedUser = await this.userService.completeUserProfile(Id, { Status: true, ...req.body });
    res.status(201).json({ status: true, user: updatedUser });
  }

  async uploadProfileImage(req, res) {
    const { file: file, tokenEmail: userEmail, tokenId: userId } = req;

    // El servicio manejará la subida a Cloudinary y la limpieza del archivo temporal
    const { imageUrl, user } = await this.userService.uploadProfileImage(userEmail, userId, file);

    res.status(201).json({
      status: true,
      message: 'Imagen de perfil actualizada con éxito.',
      imageUrl: imageUrl,
      user
    });
  }

  async profile(req, res) {
    const { tokenId: userId } = req;

    const { status, message, data } = await this.userService.profile(userId);
    if (status)
      res.status(200).json({
        status: true,
        message: message,
        data: data
      });
  }

  async updateUser(req, res) {
    const { tokenId: userId } = req;
    const { status, message, data } = await this.userService.updateUser(userId, req.body);
    res.status(200).json({ status: status, message: message, data: data });
  }

  async deleteUser(req, res) {
    const { tokenId: userId } = req;
    const { status, message, data } = await this.userService.deleteUser(userId);
    res.status(200).json({ status: status, message: message, data: data });
  }

  async changePassword(req, res) {
    const { tokenId: userId } = req;
    const { status, message, data } = await this.userService.changePassword(userId, req.body);
    res.status(200).json({ status: status, message: message, data: data });
  }
}

export default UserController;
