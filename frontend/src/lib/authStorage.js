const STORAGE_KEY = 'obschiysbor_auth';

export function getStoredAuth() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth({ access_token, refresh_token, user }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    access_token,
    refresh_token,
    user,
    saved_at: Date.now(),
  }));
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken() {
  return getStoredAuth()?.access_token || null;
}

export function getCurrentUser() {
  return getStoredAuth()?.user || null;
}

export function isAuthenticated() {
  const auth = getStoredAuth();
  if (!auth?.access_token) return false;
  // Check if token is expired (simple JWT decode)
  try {
    const payload = JSON.parse(atob(auth.access_token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
