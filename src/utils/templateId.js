// Get template ID from environment variables
const templateID = (type) => {
    switch (type) {
        case "welcome":
            return process.env.WELCOME_TEMPLATE_ID;
        case "recoverPassword":
            return process.env.RECOVER_PASSWORD_TEMPLATE_ID;
        case "confirmRecoverPassword":
            return process.env.CONFIRM_RECOVER_PASSWORD_TEMPLATE_ID;
        default:
            return process.env.WELCOME_TEMPLATE_ID;
    }
}

export default templateID;