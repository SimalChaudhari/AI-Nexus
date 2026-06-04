/**
 * Prefer backend JSON `message` from GlobalExceptionFilter; keep legacy fallbacks otherwise.
 */

function readBackendMessage(error) {
  const data = error?.response?.data;
  if (data && typeof data === 'object' && typeof data.message === 'string') {
    const text = data.message.trim();
    if (text) return text;
  }
  return '';
}

export function getApiErrorMessage(error) {
  const fromBackend = readBackendMessage(error);
  if (fromBackend) return fromBackend;

  if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
    return 'Cannot connect to server. Please ensure the backend is running.';
  }
  if (error?.response?.status === 413) {
    return 'File is too large. Please upload a smaller file.';
  }
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Network error. Please check your internet connection and ensure the server is running.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
