import * as validators from '../utils/generateValidators.js';

export const registerValidator = () => [
  validators.validateStringField('FullName'),
  validators.validateEmailField('Email'),
  validators.validateDateOfBirthField('DateOfBirth'),
  validators.validatePhoneField('telefono'),
  validators.validateAcceptedTermsField('acceptedTerms'),
  validators.validatePasswordField('Password')
];


export const completeProfileValidator = () => [
  validators.validateDateField('dateOfBirth'),
  validators.validateAcceptedTermsField('acceptedTerms'),
];

export const updateUserValidator = () => [
  validators.validateDateOfBirthField('dateOfBirth'),
  validators.validatePhoneField('telefono'),
  validators.validateEmailField('email'),
  validators.validateStringField('fullName'),
];

export const changePasswordValidator = () => [
  validators.validatePasswordField('newPassword'),
  validators.validatePasswordField('confirmPassword'),
  validators.validatePasswordConfirmationField('confirmPassword', 'newPassword'),
  validators.validateStringField('currentPassword'),
];

export const deleteUserValidator = () => [
  validators.validateAcceptedTermsField('confirmDelete'),
];