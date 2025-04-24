// src/services/AuthService.js
import UserDto from "../dto/userDto.js";
import { generateToken } from "../utils/jwt.js";
import { getId } from "../utils/uuid.js"; // Asumimos que getId genera UUIDs u otro ID para nuevos usuarios
import bcrypt from "bcrypt";
import AppError from "../utils/appError.js"; // Tu clase de error personalizada
import generateTokenRecovery from "../utils/generateTokenRecovery.js"; // Función para generar { token, expiresAt }
import sendMailViaWorker from "../adapters/sendMailViaWorker.js"; // Adapter para enviar emails

class AuthService {
  constructor(userRepository, PasswordResetTokenRepository) {
    this.userRepository = userRepository;
    this.PasswordResetTokenRepository = PasswordResetTokenRepository;
  }

  /**
   * Lógica para el inicio de sesión de usuario.
   * @param {object} params - Parámetros de inicio de sesión.
   * @param {string} params.Email - Correo electrónico del usuario.
   * @param {string} params.Password - Contraseña del usuario.
   * @returns {Promise<{token: string, message: string}>} JWT y mensaje de éxito.
   * @throws {AppError} Si las credenciales son incorrectas.
   */
  async login({ Email, Password }) {
    const user = await this.userRepository.findByEmail(Email);

    if (!user || !(await bcrypt.compare(Password, user.Password))) {
      throw new AppError("Usuario o contraseña incorrectos", 404); // Usando 404 como en tu código original
    }

    const token = generateToken(user);
    return {
      token,
      message: "Usuario logueado con éxito",
      data: { fullName: user.FullName, profilePicture: user.profilePicture }
    };
  }

  /**
   * Lógica para solicitar el proceso de recuperación de contraseña.
   * Genera un token, lo guarda y envía un email con el enlace.
   * @param {object} params - Parámetros de recuperación.
   * @param {string} params.Email - Correo electrónico del usuario.
   * @returns {Promise<{success: boolean, message: string}>} Estado y mensaje del proceso de envío de email.
   * @throws {AppError} Si hay errores (incluyendo usuario no encontrado, según tu código original).
   */
  async recoverPassword({ Email }) {

    const user = await this.userRepository.findByEmail(Email);
    if (!user) {
      console.warn(`[AuthService - RecoverPassword] User not found for email: ${Email}`);
      throw new AppError("Usuario no encontrado", 404); // Manteniendo el comportamiento original del código
    }

    const { Email: UserEmail, FullName: UserFullName } = user;
    const { token, expiresAt } = generateTokenRecovery();

    const frontendUrl = process.env.FRONTEND_URL; // Asumimos que FRONTEND_URL está configurado en variables de entorno
    if (!frontendUrl) {
      console.error("[AuthService - RecoverPassword] Error: FRONTEND_URL environment variable not configured.");
      throw new AppError("Error interno al construir el enlace de recuperación.", 500);
    }
    const url = `${frontendUrl}/recover-password?token=${token}&expiresAt=${expiresAt.toISOString()}&email=${encodeURIComponent(UserEmail)}`; // Usar ISO string para la fecha, codificar el email


    const createToken = await this.PasswordResetTokenRepository.createToken({
      token: token, // El string del token
      expiresAt: expiresAt, // La fecha de expiración
      userId: user.ID // El ID del usuario (asumimos que la PK del usuario es 'ID')
    });

    if (!createToken) {
      console.error(`[AuthService - RecoverPassword] Failed to create token for user ID ${user.ID}. Repository returned falsy.`);
      throw new AppError("Error al crear el token", 500);
    }

    try {
      const { success, message } = await sendMailViaWorker(UserEmail, 'recoverPassword', UserFullName, url);
      if (!success) {
        console.error(`[AuthService - RecoverPassword] Failed to send recovery email to ${UserEmail}. Worker response: ${message}`);
        throw new AppError("Error al enviar el correo", 500);
      }
      return { success, message: "Correo de recuperación enviado con éxito." };
    } catch (error) {
      console.error(`[AuthService - RecoverPassword] Exception sending recovery email to ${UserEmail}:`, error);
      throw new AppError("Error al enviar el correo", 500); // Re-lanzar como AppError
    }
  }

  /**
   * Lógica para cambiar la contraseña usando un token de recuperación.
   * Incluye la validación del token dentro del método.
   * @param {object} params - Parámetros para el cambio de contraseña.
   * @param {string} params.token - El valor del token de recuperación.
   * @param {string} params.password - La nueva contraseña.
   * @param {string} params.email - El email del usuario (para validación adicional).
   * @returns {Promise<{success: boolean, message: string}>} Estado y mensaje de la operación.
   * @throws {AppError} Si el enlace es inválido/expirado o hay errores internos.
   */
  async passwordChange({ token, password, email }) {
    let tokenEntry = await this.PasswordResetTokenRepository.findByToken(token);

    if (!tokenEntry) { // Si findByToken no encontró nada, tokenEntry será null
      console.warn(`[AuthService - PasswordChange] Invalid or missing token: ${token}`);
      throw new AppError("Enlace inválido", 404); // Mensaje genérico
    }

    const tokenExpiresAt = new Date(tokenEntry.expiresAt);
    const now = new Date();
    if (tokenExpiresAt < now) {
      console.warn(`[AuthService - PasswordChange] Expired token: ${token}. Expiration: ${tokenExpiresAt.toISOString()}, Now: ${now.toISOString()}`);
      // Marcar como inválido/usado si expira (usando isInvalid como en tu código)
      try { await this.PasswordResetTokenRepository.updateToken(token, { isInvalid: true }); } catch (e) { console.error("Failed to mark token as invalid after expiration check:", token, e); }
      throw new AppError("Enlace invalido", 404); // Mensaje genérico
    }

    const user = tokenEntry.user; // <--- OBTENEMOS EL USUARIO DE AQUÍ Directamente
    if (!user) {
      console.error(`[AuthService - PasswordChange] Token ${token} found but associated user is null (userId: ${tokenEntry.userId}). Data integrity issue?`);
      // Invalidar token defectuoso
      try { await this.PasswordResetTokenRepository.updateToken(token, { isInvalid: true }); } catch (e) { console.error("Failed to mark token as invalid after null user:", token, e); }
      throw new AppError("Error interno. Usuario asociado al enlace no encontrado.", 500); // Error del servidor
    }

    if (user.Email !== email) {
      console.warn(`[AuthService - PasswordChange] Email mismatch for token ${token}. Token userId: ${tokenEntry.userId}, User found by email ${email} ID: ${user.ID}`);
      // Invalidar token por seguridad
      try { await this.PasswordResetTokenRepository.updateToken(token, { isInvalid: true }); } catch (e) { console.error("Failed to mark token as invalid after email mismatch:", token, e); }
      throw new AppError("Enlace inválido", 400); // Mensaje genérico apropiado
    }


    let hashedPassword = await bcrypt.hash(password, 10);
    const updateSuccess = await this.userRepository.updateById(user.ID, { Password: hashedPassword }); // Usando user.ID y userRepository.updateById

    if (!updateSuccess) {
      console.error(`[AuthService - PasswordChange] userRepository.updateById failed for user ID ${user.ID}.`);
      throw new AppError("Error al actualizar la contraseña en la base de datos.", 500);
    }

    const updateTokenResult = await this.PasswordResetTokenRepository.updateToken(token, { isUsed: true, isInvalid: true });

    if (!updateTokenResult || updateTokenResult[0] === 0) {
      console.warn(`[AuthService - PasswordChange] Failed to mark token ${token} as invalid.`);
    }

    sendMailViaWorker(user.Email, 'confirmRecoverPassword', user.FullName);

    return { success: true, message: "Tu contraseña ha sido restablecida con éxito." };
  }


  /**
   * Lógica para encontrar o crear un usuario a través de OAuth.
   * @param {object} data - Datos del usuario obtenidos de OAuth.
   * @param {string} data.email - Email del usuario de OAuth.
   * @param {string} data.name - Nombre del usuario de OAuth.
   * @returns {Promise<{user: object, token: string, message: string}>} Usuario creado/encontrado, JWT y mensaje.
   * @throws {AppError} Si hay errores en la creación.
   */
  async findOrCreateByOAuth({ email, name }) {
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      console.info(`[AuthService - OAuth] User not found, attempting to create for email: ${email}`);
      const newUser = {
        ID: getId(), // Generar ID como en tu código original
        Email: email,
        FullName: name,
        Status: true,
      };

      const userDto = new UserDto(newUser); // Usar DTO para crear el objeto de datos
      user = await this.userRepository.create(userDto.toJSON()); // Crear en el repositorio

      if (!user) { // Verificar si el repositorio realmente retornó el usuario creado
        console.error(`[AuthService - OAuth] userRepository.create failed for email ${email}. Repository returned falsy.`);
        throw new AppError("Error al crear el usuario", 400); // Mantener estado original
      }
      sendMailViaWorker(user.Email, 'welcome', user.FullName);
    }

    const token = generateToken(user);
    return { user, token, message: user ? "Usuario autenticado con éxito" : "Usuario creado con éxito" }; // Ajustar mensaje basado en si se creó
  }
}

export default AuthService;