import axios from 'src/utils/axios';
import { handleMembershipSalesforceAuthError } from 'src/utils/membership-salesforce-auth';

// ----------------------------------------------------------------------

async function callStudentMembershipApi(request) {
  try {
    return await request();
  } catch (error) {
    if (handleMembershipSalesforceAuthError(error)) {
      const redirectError = new Error(
        'Your eServices session has expired. Redirecting to sign in…'
      );
      redirectError.code = 'SALESFORCE_SOCIAL_TOKEN_EXPIRED';
      throw redirectError;
    }
    throw error;
  }
}

export async function checkStudentMembershipUser(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/user-check', payload);
    return res.data;
  });
}

export async function createStudentMembershipApplication(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/create', payload);
    return res.data;
  });
}

export async function updateStudentMembershipApplication(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/update', payload);
    return res.data;
  });
}

export async function submitStudentMembershipApplication(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/submit', payload);
    return res.data;
  });
}

export async function fetchStudentMembershipApplicationDetails(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/details', payload);
    return res.data;
  });
}

export async function loginStudentMembershipIfStudent(payload) {
  return callStudentMembershipApi(async () => {
    const res = await axios.post('/auth/student-membership-application/student-login', payload);
    return res.data;
  });
}
