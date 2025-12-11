import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Login from '@/components/views/UV_Login';
import UV_Register from '@/components/views/UV_Register';
import { useAppStore } from '@/store/main';

/**
 * Real API E2E Auth Tests (Register -> Logout -> Sign-In)
 * 
 * These tests use the real backend API at http://localhost:3000
 * Actual network calls to verify full integration
 */

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth E2E Flow (Vitest, Real API)', () => {
  // Generate unique email for each test run to avoid conflicts
  const uniqueEmail = `user${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testFullName = 'E2E Test User';

  beforeEach(() => {
    // Clear localStorage and reset store state before each test
    localStorage.clear();
    
    // Reset authentication state to ensure clean slate
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        current_user: null,
        user_auth_token: null,
        current_agent: null,
        agent_auth_token: null,
        current_admin: null,
        admin_auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_agent_authenticated: false,
          is_admin_authenticated: false,
          is_loading: false,
          user_type: 'guest',
        },
        error_message: null,
      },
      user_favorites: {
        saved_properties: [],
        is_loading: false,
        last_updated: null,
      },
      user_notification_preferences: null,
    }));
  });

  it('completes full auth flow: register -> logout -> sign-in', async () => {
    const user = userEvent.setup();

    // ===================================
    // STEP 1: REGISTER NEW USER
    // ===================================
    const { unmount: unmountRegister } = render(<UV_Register />, { wrapper: Wrapper });

    // Fill in registration form
    const fullNameInput = await screen.findByLabelText(/full name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInputs = await screen.findAllByLabelText(/^password/i);
    const passwordInput = passwordInputs[0]; // First "Password" field
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i });
    const createButton = await screen.findByRole('button', { name: /create account/i });

    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(fullNameInput).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    // Type user data
    await user.type(fullNameInput, testFullName);
    await user.type(emailInput, uniqueEmail);
    await user.type(passwordInput, testPassword);
    await user.type(confirmPasswordInput, testPassword);
    await user.click(termsCheckbox);

    // Wait for button to be enabled
    await waitFor(() => expect(createButton).not.toBeDisabled());

    // Submit registration
    await user.click(createButton);

    // Wait for registration to complete and store to update
    await waitFor(
      () => {
        const state = useAppStore.getState();
        // After successful registration, user should be authenticated with token
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.user_auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail.toLowerCase());
        expect(state.authentication_state.current_user?.full_name).toBe(testFullName);
      },
      { timeout: 20000 }
    );

    // Verify user type is set correctly
    const stateAfterRegister = useAppStore.getState();
    expect(stateAfterRegister.authentication_state.authentication_status.user_type).toBe('property_seeker');

    // Clean up registration component
    unmountRegister();

    // ===================================
    // STEP 2: LOGOUT
    // ===================================
    const logout = useAppStore.getState().logout;
    logout();

    // Wait for logout to complete
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.user_auth_token).toBeNull();
      expect(state.authentication_state.current_user).toBeNull();
      expect(state.authentication_state.authentication_status.user_type).toBe('guest');
    });

    // ===================================
    // STEP 3: SIGN-IN WITH SAME CREDENTIALS
    // ===================================
    const { unmount: unmountLogin } = render(<UV_Login />, { wrapper: Wrapper });

    // Find login form inputs - use more resilient selectors
    const loginEmailInput = await screen.findByLabelText(/email address/i);
    const loginPasswordInput = screen.getByPlaceholderText(/enter your password/i); // Use placeholder instead
    const signInButton = await screen.findByRole('button', { name: /sign in$/i });

    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(loginEmailInput).not.toBeDisabled();
      expect(loginPasswordInput).not.toBeDisabled();
    });

    // Type credentials
    await user.type(loginEmailInput, uniqueEmail);
    await user.type(loginPasswordInput, testPassword);

    // Wait for button to be enabled
    await waitFor(() => expect(signInButton).not.toBeDisabled());

    // Submit login
    await user.click(signInButton);

    // Wait for authentication to complete by checking the store
    // Don't check for "Signing in..." text as it might be transient
    await waitFor(
      () => {
        const state = useAppStore.getState();
        const isAuth = state.authentication_state.authentication_status.is_authenticated;
        const hasToken = !!state.authentication_state.user_auth_token;
        const hasUser = !!state.authentication_state.current_user;
        
        if (!isAuth || !hasToken || !hasUser) {
          // Still waiting, throw to continue waiting
          throw new Error(`Auth incomplete: isAuth=${isAuth}, hasToken=${hasToken}, hasUser=${hasUser}`);
        }
        
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.user_auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail.toLowerCase());
        expect(state.authentication_state.authentication_status.user_type).toBe('property_seeker');
      },
      { timeout: 20000 }
    );

    // Verify the same user data is retrieved
    const finalState = useAppStore.getState();
    expect(finalState.authentication_state.current_user?.full_name).toBe(testFullName);
    expect(finalState.authentication_state.current_user?.email).toBe(uniqueEmail.toLowerCase());

    // Clean up login component
    unmountLogin();
  }, 60000); // 60 second timeout for full flow

  it('handles registration with duplicate email gracefully', async () => {
    const user = userEvent.setup();

    // Use a known email that already exists in the database
    const existingEmail = 'john.smith@example.com'; // From seed data
    
    render(<UV_Register />, { wrapper: Wrapper });

    // Fill in registration form with existing email
    const fullNameInput = await screen.findByLabelText(/full name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInputs = await screen.findAllByLabelText(/^password/i);
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i });
    const createButton = await screen.findByRole('button', { name: /create account/i });

    await user.type(fullNameInput, 'Test User');
    await user.type(emailInput, existingEmail);
    await user.type(passwordInput, testPassword);
    await user.type(confirmPasswordInput, testPassword);
    await user.click(termsCheckbox);

    await waitFor(() => expect(createButton).not.toBeDisabled());

    // Submit registration
    await user.click(createButton);

    // Wait for error message to appear
    await waitFor(
      () => {
        // Should show error message about email already existing
        const errorMessage = screen.getByText(/already exists/i);
        expect(errorMessage).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify user is NOT authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    expect(state.authentication_state.user_auth_token).toBeNull();
  }, 30000);

  it('handles sign-in with invalid credentials gracefully', async () => {
    const user = userEvent.setup();

    render(<UV_Login />, { wrapper: Wrapper });

    // Find form inputs
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = await screen.findByRole('button', { name: /sign in$/i });

    // Type invalid credentials
    await user.type(emailInput, 'nonexistent@example.com');
    await user.type(passwordInput, 'WrongPassword123!');

    await waitFor(() => expect(signInButton).not.toBeDisabled());

    // Submit login
    await user.click(signInButton);

    // Wait for error message
    await waitFor(
      () => {
        // Should show invalid credentials error
        const errorMessage = screen.getByText(/invalid.*email.*password/i);
        expect(errorMessage).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify user is NOT authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    expect(state.authentication_state.user_auth_token).toBeNull();
  }, 30000);

  it('validates required fields in registration form', async () => {
    render(<UV_Register />, { wrapper: Wrapper });

    // Try to submit empty form - HTML5 validation will prevent submission
    // so we just check that the required attributes are present
    const fullNameInput = await screen.findByLabelText(/full name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInputs = await screen.findAllByLabelText(/^password/i);
    const passwordInput = passwordInputs[0];

    // Check required attributes are present
    expect(fullNameInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');

    // Verify user is NOT authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
  }, 30000);

  it('validates password confirmation matches', async () => {
    const user = userEvent.setup();

    render(<UV_Register />, { wrapper: Wrapper });

    const fullNameInput = await screen.findByLabelText(/full name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInputs = await screen.findAllByLabelText(/^password/i);
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i });
    const createButton = await screen.findByRole('button', { name: /create account/i });

    // Fill form with mismatched passwords
    await user.type(fullNameInput, 'Test User');
    await user.type(emailInput, `test${Date.now()}@example.com`);
    await user.type(passwordInput, testPassword);
    await user.type(confirmPasswordInput, 'DifferentPassword123!');
    await user.click(termsCheckbox);

    await user.click(createButton);

    // Should show password mismatch error
    await waitFor(() => {
      const mismatchError = screen.getByText(/passwords do not match/i);
      expect(mismatchError).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify user is NOT authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
  }, 30000);

  it('successfully signs in with existing seed user', async () => {
    const user = userEvent.setup();

    // Use credentials from seed data (users table)
    const seedEmail = 'john.smith@example.com';
    const seedPassword = 'password123'; // From db.sql seed data

    render(<UV_Login />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = await screen.findByRole('button', { name: /sign in$/i });

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    await user.type(emailInput, seedEmail);
    await user.type(passwordInput, seedPassword);

    await waitFor(() => expect(signInButton).not.toBeDisabled());
    await user.click(signInButton);

    // Wait for authentication to complete
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.user_auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(seedEmail);
        expect(state.authentication_state.current_user?.full_name).toBe('John Smith');
      },
      { timeout: 20000 }
    );
  }, 30000);
});
