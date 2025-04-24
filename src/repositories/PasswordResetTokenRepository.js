import PasswordResetToken from "../database/models/tokensRecovery.js";
import User from "../database/models/user.js";

class PasswordResetTokenRepository {
    createToken = async (data) => await PasswordResetToken.create(data);
    findByToken = async (token) => await PasswordResetToken.findOne({
        where: { token }, include: { // Incluir el usuario asociado
            model: User,
            as: 'user' // Usar el alias definido en la asociación belongsTo
        }
    });

    updateToken = async (token, data) => await PasswordResetToken.update(data, { where: { token } });
}

export default PasswordResetTokenRepository;