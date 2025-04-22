import * as validator from "../utils/generateValidators.js";

export const loginValidator = () => [
  validator.validateEmailField('Email'),
  validator.validatePasswordField('Password')
];

export const recoveryPassword = () => [
  validator.validateEmailField('Email')
];

export const passwordChange = () => [
  validator.validateTokenField('token'),
  validator.validatePasswordField('password'),
  validator.validatePasswordField('passwordConfirmation'),
  validator.validateEmailField('email'),
  validator.validatePasswordConfirmationField('passwordConfirmation')
];