import PreferencesProfile from "../database/models/preferencesProfile.js";

export default class PreferencesProfileRepository {
    async findByuserID(userId) {
        return await PreferencesProfile.findOne({ where: { userId } });
    }

    async create(data) {
        return await PreferencesProfile.create(data);
    }

    /**
     * Actualiza un perfil de preferencia por su ID de usuario y devuelve el perfil actualizado.
     * @param {string|number} userId - El ID del usuario.
     * @param {object} data - Los datos a actualizar.
     * @returns {Promise<PreferencesProfile|null>} El perfil actualizado o null si no se encontró.
     */
    async updateByUserId(userId, data) {
        const includes = []; // Array vacío por defecto si no necesitas relaciones

        const [numberOfAffectedRows] = await PreferencesProfile.update(data, {
            where: { userId: userId },
        });

        if (numberOfAffectedRows === 0) {
            return null; // No se encontró el perfil con ese userId
        }

        // Busca el registro actualizado para obtener sus datos completos (con includes si están definidos)
        const updatedProfile = await PreferencesProfile.findOne({
            where: { userId: userId },
            include: includes,
        });

        return updatedProfile; // Retorna el objeto del perfil actualizado
    }

    /**
     * Elimina un perfil de preferencia por su ID de usuario.
     * @param {string|number} userId - El ID del usuario.
     * @returns {Promise<number>} El número de filas eliminadas.
     */
    async deleteByUserId(userId) {
        // Asumiendo que 'userId' es la columna correcta para buscar
        return await PreferencesProfile.destroy({ where: { userId: userId } });
    }
}