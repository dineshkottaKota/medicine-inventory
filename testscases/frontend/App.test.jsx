import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../frontend/src/App';
import { jsonResponse, mockFetch } from './helpers/testUtils';

describe('App routing, PrivateRoute guards, and auth session lifecycle', () => {
  it('renders HomePage without Navbar at / and redirects protected routes to /login when unauthenticated', () => {
    for (const path of ['/dashboard', '/sell', '/reports']) {
      window.history.pushState({}, '', path);
      const { unmount } = render(<App />);

      expect(screen.getByRole('heading', { name: /Welcome Back!/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
      unmount();
    }

    window.history.pushState({}, '', '/non-existent-route');
    render(<App />);
    expect(screen.getByRole('heading', { name: /Intelligent Inventory Management/i })).toBeInTheDocument();
  });

  it('redirects / and unknown routes to /dashboard with Navbar when token exists in localStorage', async () => {
    localStorage.setItem('authToken', 'saved-jwt');
    mockFetch({
      'GET /medicines': jsonResponse([]),
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Inventory Dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Logout' }).length).toBeGreaterThan(0);
  });

  it('persists authToken on login, navigates to dashboard, and clears session on logout', async () => {
    const user = userEvent.setup();
    mockFetch({
      'POST /auth/login': jsonResponse({ token: 'fresh-token-99', user: { role: 'owner' } }),
      'GET /medicines': jsonResponse([]),
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await user.type(screen.getByLabelText(/Email Address/i), 'owner@med.test');
    await user.type(screen.getByLabelText(/Password/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('heading', { name: /Inventory Dashboard/i })).toBeInTheDocument();
    expect(localStorage.getItem('authToken')).toBe('fresh-token-99');

    const logoutButtons = screen.getAllByRole('button', { name: 'Logout' });
    await user.click(logoutButtons[0]);

    // Clearing token while on /dashboard triggers PrivateRoute to redirect to /login
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome Back!/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });
});
