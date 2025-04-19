import PreferencesProfile from "../database/models/preferencesProfile";

export default class PreferencesProfileRepository {
    async findByuserID(userId) {
        return await PreferencesProfile.findOne({ where: { userId } });
    }

    async create(data) {
        return await PreferencesProfile.create(data);
    }

    async updateByUserId(id, data) {
        return await PreferencesProfile.update(data, { where: { ID: id } });
    }

    async deleteByUserId(id) {
        return await PreferencesProfile.destroy({ where: { ID: id } });
    }
}