import AppError from "../utils/appError";
export default class PreferencesProfileService {
    constructor(PreferencesProfileRepository, coingecoRepository) {
        this.PreferencesProfileRepository = PreferencesProfileRepository;
        this.coingecoRepository = coingecoRepository;
    }

    async getCoinsList() {
        const coinList = await this.coingecoRepository.coinsList();
        if (!coinList) {
            throw new AppError('Error al obtener la lista de monedas', 500);
        }

        const coins = coinList.map(coin => ({
            id: coin.id,
            name: coin.name
        }));

        return coins;
    }

    async getPreferencesProfile(userId) {
        const preferencesProfile = await this.PreferencesProfileRepository.findByuserID(userId);
        if (!preferencesProfile) {
            return {
                status: false,
                message: 'No se encontró el perfil de preferencias',
                data: null
            };
        }

        return preferencesProfile;
    }

    async createPreferencesProfile(data) {
        const preferencesProfile = await this.PreferencesProfileRepository.create(data);
        if (!preferencesProfile) {
            throw new AppError('Error al crear el perfil de preferencias', 500);
        }

        return preferencesProfile;
    }
    async updatePreferencesProfile(userId, data) {
        const preferencesProfile = await this.PreferencesProfileRepository.updateByUserId(userId, data);
        if (!preferencesProfile) {
            throw new AppError('Error al actualizar el perfil de preferencias', 500);
        }

        return preferencesProfile;
    }

    async deletePreferencesProfile(userId) {
        const preferencesProfile = await this.PreferencesProfileRepository.deleteByUserId(userId);
        if (!preferencesProfile) {
            throw new AppError('Error al eliminar el perfil de preferencias', 500);
        }

        return preferencesProfile;
    }
}