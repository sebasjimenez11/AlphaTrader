import AppError from "../utils/appError.js";
import PreferencesProfileDto from "../dto/preferencesProfileDto.js";

export default class PreferencesProfileController {

    constructor(preferencesProfileService) {
        this.preferencesProfileService = preferencesProfileService;
    }

    async getPreferencesProfile(req, res) {
        const { tokenId } = req;

        const profile = await this.preferencesProfileService.getPreferencesProfile(tokenId);
        if (!profile)
            res.status(404).json({
                status: false,
                message: 'No se encontró el perfil de preferencias',
                data: [],
            });
        else
            res.status(200).json({
                status: true,
                message: 'Perfil de preferencias encontrado',
                data: profile
            });
    }

    async createPreferencesProfile(req, res) {
        const { tokenId: userId } = req;
        const preferenceProfileDto = new PreferencesProfileDto({ userId, ...req.body });
        const { status, message, data } = await this.preferencesProfileService.createPreferencesProfile(preferenceProfileDto.toJSON());
        if (status)
            res.status(200).json({
                status: true,
                message: message,
                data: data
            });
        else
            res.status(400).json({ status: false, message: message, data: null });
    }

    async updatePreferencesProfile(req, res) {
        const { tokenId: userId } = req;
        const { status, message, data } = await this.preferencesProfileService.updatePreferencesProfile(userId, req.body);
        if (status)
            res.status(200).json({
                status: true,
                message: message,
                data: data
            });
        else
            res.status(400).json({ status: false, message: message, data: null });
    }

    async deletePreferencesProfile(req, res) {
        const { tokenId: userId } = req;
        const { status, message, data } = await this.preferencesProfileService.deletePreferencesProfile(userId);
        if (status)
            res.status(200).json({
                status: true,
                message: message,
                data: data
            });
        else
            res.status(400).json({ status: false, message: message, data: null });
    }

    async getCoinsList(req, res) {
        const { status, message, data } = await this.preferencesProfileService.getCoinsList();
        if (status)
            res.status(200).json({
                status: true,
                message: message,
                data: data
            });
        else
            res.status(400).json({ status: false, message: message, data: null });
    }
}