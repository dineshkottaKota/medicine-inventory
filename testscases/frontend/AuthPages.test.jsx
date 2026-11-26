import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LoginPage from '../../frontend/src/pages/LoginPage';
import RegisterPage from '../../frontend/src/pages/RegisterPage';
import { API_BASE_URL, jsonResponse, mockFetch } from './helpers/testUtils';

describe('LoginPage and RegisterPage', () => {
  describe('LoginPage', () => {
    it('submits credentials, displays loading state, calls onLoginSuccess, and navigates to /dashboard', async () => {
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();

      let resolveLogin;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      const fetchSpy = mockFetch({
        'POST /auth/login': () => loginPromise,
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage onLoginSuccess={onLoginSuccess} />} />
            <Route path="/dashboard" element={<div>Dashboard Landing</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/register');

      await user.type(screen.getByLabelText(/Email Address/i), 'owner@pharmacy.test');
      await user.type(screen.getByLabelText(/Password/i), 'Secret123!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      const loadingBtn = screen.getByRole('button', { name: 'Signing In...' });
      expect(loadingBtn).toBeDisabled();

      resolveLogin(jsonResponse({ token: 'jwt-token-123', user: { role: 'owner' } }));

      await waitFor(() => {
        expect(screen.getByText('Dashboard Landing')).toBeInTheDocument();
      });

      expect(onLoginSuccess).toHaveBeenCalledWith('jwt-token-123');
      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'owner@pharmacy.test', password: 'Secret123!' }),
        })
      );
    });

    it('shows error alert when login fails with server error', async () => {
      const user = userEvent.setup();
      mockFetch({
        'POST /auth/login': jsonResponse({ message: 'Invalid credentials' }, { status: 401 }),
      });

      render(
        <MemoryRouter>
          <LoginPage onLoginSuccess={vi.fn()} />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/Email Address/i), 'bad@test.com');
      await user.type(screen.getByLabelText(/Password/i), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Invalid credentials');
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    });
  });

  describe('RegisterPage', () => {
    it('registers user with selected role and shows success banner', async () => {
      const user = userEvent.setup();
      let resolveRegister;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });
      const fetchSpy = mockFetch({
        'POST /auth/register': () => registerPromise,
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/Role/i)).toHaveValue('staff');
      expect(screen.getByRole('link', { name: 'Login here' })).toHaveAttribute('href', '/login');

      await user.type(screen.getByLabelText(/Username/i), 'pharmacy_owner');
      await user.type(screen.getByLabelText(/Email Address/i), 'owner@med.test');
      await user.type(screen.getByLabelText(/Password/i), 'OwnerPass123!');
      await user.selectOptions(screen.getByLabelText(/Role/i), 'owner');
      await user.click(screen.getByRole('button', { name: 'Register' }));

      expect(screen.getByRole('button', { name: 'Registering...' })).toBeDisabled();

      resolveRegister(jsonResponse({ message: 'User registered successfully' }, { status: 201 }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Registration successful! You can now log in.');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'pharmacy_owner',
            email: 'owner@med.test',
            password: 'OwnerPass123!',
            role: 'owner',
          }),
        })
      );
    });

    it('shows error alert when registration fails (e.g. duplicate email)', async () => {
      const user = userEvent.setup();
      mockFetch({
        'POST /auth/register': jsonResponse({ message: 'Email already registered' }, { status: 409 }),
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/Username/i), 'dup');
      await user.type(screen.getByLabelText(/Email Address/i), 'dup@med.test');
      await user.type(screen.getByLabelText(/Password/i), 'Pass123!');
      await user.click(screen.getByRole('button', { name: 'Register' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Email already registered');
    });
  });
});
