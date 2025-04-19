import AppError from "../utils/appError";
import PreferencesProfileDto from "../dto/preferencesProfileDto";

export default class PreferencesProfileController {

    constructor(preferencesProfileRepository, CoinGeckoAdapter) {
        this.CoinGeckoAdapter = CoinGeckoAdapter;
        this.preferencesProfileRepository = preferencesProfileRepository;
    }

    async getPreferencesProfile(req, res) {
        const { tokenId } = req.body;

        const profile = await this.preferencesProfileRepository.findByuserID(tokenId);
        if (!profile)
            res.status(404).json({
                status: false,
                message: 'No se encontró el perfil de preferencias',
                data: null
            });
        else
            res.status(200).json({
                status: true,
                message: 'Perfil de preferencias encontrado',
                data: profile
            });
    }

    async createPreferencesProfile(req, res) {
    }

    async updatePreferencesProfile(req, res) {
    }

    async deletePreferencesProfile(req, res) {
    }
};