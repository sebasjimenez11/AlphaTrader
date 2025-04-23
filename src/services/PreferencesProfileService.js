import AppError from "../utils/appError.js";
export default class PreferencesProfileService {
    constructor(PreferencesProfileRepository, CoinGeckoAdapter) {
        this.PreferencesProfileRepository = PreferencesProfileRepository;
        this.CoinGeckoAdapter = CoinGeckoAdapter;
    }

    async getCoinsList() {
        const coinList = await this.CoinGeckoAdapter.coinsList();
        if (!coinList) {
            throw new AppError('Error al obtener la lista de monedas', 500);
        }
        
        const coins = coinList.map(coin => ({
            name: coin.Id,
            symbol: coin.symbolo
        }));

        return {
            status: true,
            message: 'Lista de monedas obtenida correctamente',
            data: coins
        };
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

        return {
            status: true,
            message: "Perfil de preferencias encontrado correctamente",
            data: preferencesProfile
        };
    }

    async createPreferencesProfile(data) {
        const { userId } = data;
        const profile = await this.PreferencesProfileRepository.findByuserID(userId);
        if (profile) {
            throw new AppError('El perfil de preferencias ya existe', 400);
        }

        const preferencesProfile = await this.PreferencesProfileRepository.create(data);
        if (!preferencesProfile) {
            throw new AppError('Error al crear el perfil de preferencias', 500);
        }

        return {
            status: true,
            message: 'Perfil de preferencias creado correctamente',
            data: preferencesProfile
        };
    }
    async updatePreferencesProfile(userId, data) {
        const preferencesProfile = await this.PreferencesProfileRepository.updateByUserId(userId, data);
        if (!preferencesProfile) {
            throw new AppError('Error al actualizar el perfil de preferencias', 500);
        }

        return {
            status: true,
            message: 'Perfil de preferencias actualizado correctamente',
            data: preferencesProfile
        };
    }

    async deletePreferencesProfile(userId) {
        const preferencesProfile = await this.PreferencesProfileRepository.deleteByUserId(userId);
        if (!preferencesProfile) {
            throw new AppError('Error al eliminar el perfil de preferencias', 500);
        }

        return {
            status: true,
            message: 'Perfil de preferencias eliminado correctamente',
            data: preferencesProfile
        };
    }
}