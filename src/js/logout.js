import { supabase } from './client.js';
import { clearAdminSession } from './session.js';

export async function handleLogout() {
  try {
    await supabase.auth.signOut();
    clearAdminSession();
    window.location.href = '/admin-login';
  } catch (error) {
    console.error('Logout error:', error);
    clearAdminSession();
    window.location.href = '/admin-login';
  }
}

// Auto-initialize if logout-btn exists (for backward compatibility)
document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
});
