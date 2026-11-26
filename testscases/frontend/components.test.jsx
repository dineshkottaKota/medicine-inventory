import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LoadingSpinner from '../../frontend/src/components/LoadingSpinner';
import Modal from '../../frontend/src/components/Modal';
import Navbar from '../../frontend/src/components/Navbar';

describe('Shared UI components', () => {
  describe('LoadingSpinner', () => {
    it('renders default and custom messages', () => {
      const { rerender } = render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(<LoadingSpinner message="Loading medicines..." />);
      expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders children and triggers onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Modal onClose={onClose}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
      const closeBtn = screen.getByRole('button', { name: '×' });
      await user.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal onClose={vi.fn()} showCloseButton={false}>
          <p>Locked content</p>
        </Modal>
      );

      expect(screen.getByText('Locked content')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
    });
  });

  describe('Navbar', () => {
    it('highlights the active link, toggles mobile menu, and handles logout navigation', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();

      const { container } = render(
        <MemoryRouter initialEntries={['/sell']}>
          <Routes>
            <Route path="/" element={<div>Home Route</div>} />
            <Route path="*" element={<Navbar onLogout={onLogout} />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: /MedInventory/i })).toHaveAttribute('href', '/dashboard');

      const sellLinks = screen.getAllByRole('link', { name: 'Sell Medicine' });
      expect(sellLinks.length).toBe(2); // desktop and mobile menu
      for (const link of sellLinks) {
        expect(link).toHaveStyle({ backgroundColor: 'rgb(37, 99, 235)' });
      }

      const mobileMenuToggle = screen.getByRole('button', { name: /Open main menu/i });
      const mobileDropdown = container.querySelector('nav > div:last-child');
      expect(mobileDropdown).toHaveClass('hidden');

      await user.click(mobileMenuToggle);
      expect(mobileDropdown).toHaveClass('block');
      expect(mobileDropdown).not.toHaveClass('hidden');

      const logoutButtons = screen.getAllByRole('button', { name: 'Logout' });
      await user.click(logoutButtons[0]);
      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Home Route')).toBeInTheDocument();
    });
  });
});
