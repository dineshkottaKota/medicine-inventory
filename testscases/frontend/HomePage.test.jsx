import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import HomePage from '../../frontend/src/pages/HomePage';

describe('HomePage', () => {
  it('renders marketing content, auth links, and footer', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Intelligent Inventory Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Get Started for Free' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
    expect(screen.getByText('Effortless Tracking')).toBeInTheDocument();
    expect(screen.getByText('Simple & Intuitive')).toBeInTheDocument();
    expect(screen.getByText(/2025 MedInventory/i)).toBeInTheDocument();
  });

  it('observes feature cards with IntersectionObserver, animates on intersect, and cleans up on unmount', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(globalThis.__MockIntersectionObserver.instances).toHaveLength(1);
    const observer = globalThis.__MockIntersectionObserver.instances[0];
    const cards = container.querySelectorAll('.feature-card');

    expect(cards).toHaveLength(2);
    expect(observer.observe).toHaveBeenCalledTimes(2);
    cards.forEach((card) => expect(card).not.toHaveClass('animate-fadeInUp'));

    observer.triggerAll(false);
    cards.forEach((card) => expect(card).not.toHaveClass('animate-fadeInUp'));

    observer.triggerAll(true);
    cards.forEach((card) => expect(card).toHaveClass('animate-fadeInUp'));

    unmount();
    expect(observer.unobserve).toHaveBeenCalledTimes(2);
  });
});
