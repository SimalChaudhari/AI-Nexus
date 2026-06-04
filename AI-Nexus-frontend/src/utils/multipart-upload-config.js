/** Let the browser set multipart boundary (do not send bare `multipart/form-data`). */
export function multipartUploadConfig(config = {}) {
  const headers = { ...(config.headers || {}) };
  delete headers['Content-Type'];
  delete headers['content-type'];
  return { ...config, headers };
}
