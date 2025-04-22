import PasswordResetToken from "../database/models/tokensRecovery";
import User from "../database/models/user";

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

export default new PasswordResetTokenRepository();