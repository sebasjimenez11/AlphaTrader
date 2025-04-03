import * as validator from "../utils/generateValidators.js";

export const loginValidator = () => [
  validator.validateEmailField('Email'),
  validator.validatePasswordField('Password')
];

export const recoveryPassword = () => [
  validator.validateEmailField('Email')
];