// Admin login with Supabase authentication
import { supabase } from './client.js';
import {
  persistAdminSession,
  redirectIfAuthenticated,
  setSessionLoading,
  clearSessionLoading,
} from './session.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const loginText = document.getElementById('login-text');
  const loginLoading = document.getElementById('login-loading');
  const loginButton = document.getElementById('login-button');
  
  if (!loginForm) return;

  // Check if already logged in
  redirectIfAuthenticated('/admin/shipments');

  function showError(message) {
    if (errorText) {
      errorText.textContent = message;
    }
    if (errorMessage) {
      errorMessage.classList.remove('hidden');
    }
  }

  function hideError() {
    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }
  }

  function setLoadingState(loading) {
    if (loading) {
      if (loginText) loginText.classList.add('hidden');
      if (loginLoading) loginLoading.classList.remove('hidden');
      if (loginButton) loginButton.disabled = true;
    } else {
      if (loginText) loginText.classList.remove('hidden');
      if (loginLoading) loginLoading.classList.add('hidden');
      if (loginButton) loginButton.disabled = false;
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    
    if (!emailInput || !passwordInput) {
      showError('Form fields not found. Please refresh the page.');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    try {
      hideError();
      setLoadingState(true);
      
      // Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }
      
      if (data?.session && data?.user) {
        persistAdminSession(data.session);
        // Redirect to shipments page
        window.location.href = '/admin/shipments';
      } else if (data?.user) {
        persistAdminSession({ user: data.user });
        window.location.href = '/admin/shipments';
      } else {
        throw new Error('No session or user data received');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      // Check for specific Supabase error codes
      if (error.status === 400 || error.code === 'email_not_confirmed') {
        errorMessage = 'Email not confirmed. Please confirm your email address in Supabase dashboard or disable email confirmation in project settings.';
      } else if (error.message) {
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          errorMessage = 'Email not confirmed. For admin users, please confirm the email in Supabase dashboard (Authentication > Users) or disable email confirmation in project settings.';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'User not found. Please check your email address.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(errorMessage);
      setLoadingState(false);
    }
  });
});
