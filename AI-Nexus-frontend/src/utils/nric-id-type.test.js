import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSalesforceNexusUserPayloadFromSignup } from './nric-id-type.js';

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
  });

  assert.equal(payload.company, 'xyz Corporation Pte Ltd');
  assert.equal(payload.jobFunction, 'Software Engineer I');
  assert.equal(payload.countryOfResidence, 'Singapore');
  assert.equal(payload.noOfYearOfRelevantWorkExperience, 10);
  assert.equal(payload.id_type, 'NRIC number');
  assert.equal(payload.id_number, 'S45678967A');
});
