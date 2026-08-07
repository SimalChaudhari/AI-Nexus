import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSalesforceNexusUserPayloadFromSignup,
  buildSalesforceSignupForNexusPayloadFromSignup,
} from './nric-id-type.js';

test('buildSalesforceNexusUserPayloadFromSignup includes the new profile fields', () => {
  const payload = buildSalesforceNexusUserPayloadFromSignup({
    salutation: 'Mr',
    firstName: 'John',
    lastName: 'Doe Test Account New 456',
    email: 'john.doe.newtest45678@example.com',
    nameAsPerId: 'John Doe Account New 456',
    idType: 'NRIC number',
    idNumber: 'S45678967A',
    company: 'xyz Corporation Pte Ltd',
    jobFunction: 'Software Engineer I',
    countryOfResidence: 'Singapore',
    yearsOfExperience: 10,
    mobile: '+6591234567',
  });

  assert.equal(payload.company, 'xyz Corporation Pte Ltd');
  assert.equal(payload.jobFunction, 'Software Engineer I');
  assert.equal(payload.countryOfResidence, 'Singapore');
  assert.equal(payload.noOfYearOfRelevantWorkExperience, 10);
  assert.equal(payload.id_type, 'NRIC number');
  assert.equal(payload.id_number, 'S45678967A');
  assert.equal(payload.mobile, '+6591234567');
});

test('buildSalesforceSignupForNexusPayloadFromSignup includes companyCode for QR enrollment', () => {
  const payload = buildSalesforceSignupForNexusPayloadFromSignup({
    salutation: 'Mr',
    firstName: 'John',
    lastName: 'Doe Test new 123',
    email: 'john.doenew1235@testemail.com',
    company: 'Acme Corporation',
    jobFunction: 'Software Engineer',
    countryOfResidence: 'Singapore',
    companyCode: 'ACME001',
    yearsOfExperience: 5.5,
  });

  assert.equal(payload.companyCode, 'ACME001');
  assert.equal(payload.company, 'Acme Corporation');
  assert.equal(payload.jobFunction, 'Software Engineer');
  assert.equal(payload.password, undefined);
  assert.equal(payload.name_as_per_id, undefined);
  assert.equal(payload.noOfYearOfRelevantWorkExperience, 5.5);
  assert.equal(payload.id_type, undefined);
  assert.equal(payload.Is_paid, undefined);
});

test('buildSalesforceSignupForNexusPayloadFromSignup includes NRIC when provided', () => {
  const payload = buildSalesforceSignupForNexusPayloadFromSignup({
    salutation: 'Ms',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    company: 'Acme Corporation',
    jobFunction: 'Accountant',
    countryOfResidence: 'Singapore',
    companyCode: 'ACME001',
    yearsOfExperience: 3,
    idNumber: 's1234567a',
    idType: 'NRIC number',
  });

  assert.equal(payload.id_number, 'S1234567A');
  assert.equal(payload.id_type, 'NRIC number');
});
