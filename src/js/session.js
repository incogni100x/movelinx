import { supabase } from './client.js';

const STORAGE_KEYS = {
  loggedIn: 'adminLoggedIn',
  userEmail: 'adminUser',
  userId: 'adminUserId',
};

let activeSubmitButtons = new WeakMap();

export function persistAdminSession(session) {
  if (!session || !session.user) return;

  sessionStorage.setItem(STORAGE_KEYS.loggedIn, 'true');
  sessionStorage.setItem(STORAGE_KEYS.userEmail, session.user.email ?? '');
  sessionStorage.setItem(STORAGE_KEYS.userId, session.user.id ?? '');
}

export function clearAdminSession() {
  sessionStorage.removeItem(STORAGE_KEYS.loggedIn);
  sessionStorage.removeItem(STORAGE_KEYS.userEmail);
  sessionStorage.removeItem(STORAGE_KEYS.userId);
}

export function getStoredAdminUser() {
  const loggedIn = sessionStorage.getItem(STORAGE_KEYS.loggedIn) === 'true';
  if (!loggedIn) return null;

  return {
    email: sessionStorage.getItem(STORAGE_KEYS.userEmail) ?? '',
    id: sessionStorage.getItem(STORAGE_KEYS.userId) ?? '',
  };
}

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Supabase session error:', error);
    return null;
  }
  return data?.session ?? null;
}

export async function requireAdminAuth({ redirectTo = '/admin-login' } = {}) {
  try {
    // First, try to get the current session
    const session = await getSupabaseSession();

    if (session?.user) {
      persistAdminSession(session);
      return session;
    }

    // If no session, try to get user from stored sessionStorage
    const stored = getStoredAdminUser();
    if (stored) {
      // Try to refresh/get the user from Supabase
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Supabase getUser error:', error);
        // If error, clear session and redirect
        clearAdminSession();
        if (redirectTo) {
          window.location.href = redirectTo;
        }
        return null;
      }
      if (data?.user) {
        // User is valid, persist session
        persistAdminSession({ user: data.user });
        return { user: data.user };
      }
    }

    // No valid session or user found
    clearAdminSession();
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return null;
  } catch (error) {
    console.error('requireAdminAuth error:', error);
    clearAdminSession();
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return null;
  }
}

export async function redirectIfAuthenticated(redirectTo = '/admin/shipments') {
  const session = await getSupabaseSession();

  if (session?.user) {
    persistAdminSession(session);
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return true;
  }

  const stored = getStoredAdminUser();
  if (stored && redirectTo) {
    window.location.href = redirectTo;
    return true;
  }

  return false;
}

export function setSessionLoading(buttonEl, loadingText = 'Loading...') {
  if (!buttonEl) return;

  activeSubmitButtons.set(buttonEl, buttonEl.textContent ?? '');
  buttonEl.disabled = true;
  buttonEl.textContent = loadingText;
  buttonEl.classList.add('opacity-70', 'cursor-not-allowed');
}

export function clearSessionLoading(buttonEl) {
  if (!buttonEl) return;

  const originalText = activeSubmitButtons.get(buttonEl);
  buttonEl.disabled = false;
  if (originalText !== undefined) {
    buttonEl.textContent = originalText;
    activeSubmitButtons.delete(buttonEl);
  }
  buttonEl.classList.remove('opacity-70', 'cursor-not-allowed');
}

export function getCurrentAdminEmail() {
  const stored = getStoredAdminUser();
  return stored?.email ?? '';
}
