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
  validators.validateStringField('FullName'),
   validators.validateDateField('dateOfBirth'),
  validators.validateAcceptedTermsField('acceptedTerms'),

];