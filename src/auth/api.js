export class ApiRequestError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  if (isLocalDevelopment()) {
    const { localApiRequest } = await import('./localApi.js');
    return localApiRequest(path, options);
  }

  const headers = new Headers(options.headers || {});
  let body = options.body;
  if (body && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(path, { ...options, body, headers, credentials: 'same-origin' });
  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiRequestError(error?.message || 'Sorğu tamamlanmadı.', response.status, error?.code || 'request_failed', error?.details);
  }
  return payload;
}

export function isLocalDevelopment() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
}

export function getAuthSession() {
  return apiRequest('/api/auth/session');
}

export function finishOnboarding(data) {
  return apiRequest('/api/auth/onboarding', { method: 'POST', body: data });
}

export function saveProfile(data) {
  return apiRequest('/api/profile', { method: 'PATCH', body: data });
}

export function secureSignInUrl(returnTo = '/login') {
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/login';
  if (isLocalDevelopment()) return safeReturnTo;
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function secureSignOutUrl(returnTo = '/') {
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  if (isLocalDevelopment()) {
    globalThis.localStorage?.removeItem('sl_local_api_session_v1');
    return safeReturnTo;
  }
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export async function uploadFile(file, kind) {
  return apiRequest('/api/files', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-file-name': file.name,
      'x-file-kind': kind,
    },
    body: file,
  });
}
