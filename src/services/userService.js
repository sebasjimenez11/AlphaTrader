// src/services/userService.js
import { generateToken } from '../utils/jwt.js';
import generateHash from '../utils/generateHash.js';
import AppError from '../utils/appError.js';
import uploadToCloudinary from '../utils/cloudinaryUploader.js';

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

  async uploadProfileImage(userEmail, userId, file) {
    try {
      const { secure_url, public_id } = await uploadToCloudinary(file.path, {
        public_id: `profile_pictures/${user.id}`, // Ejemplo: Usar ID de usuario como public ID
        overwrite: true // Asegurarse de sobrescribir si usas un public_id fijo
      });

      const user = await this.userRepository.updateById(userId, { profilePicture: secure_url, public_id: public_id }); // Asumiendo que userRepository tiene un método save o equivalente para actualizar
      if (!user) {
        throw new AppError('Error al actualizar la imagen de perfil', 400);
      }
      return { user, imageUrl: secure_url };

    } catch (error) {
      console.error("❌ Error en UserService.uploadProfileImage:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error interno al subir la imagen de perfil.', 500);
    }
  }
}

export default UserService;
