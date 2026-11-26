import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DashboardPage from '../../frontend/src/pages/DashboardPage';
import { API_BASE_URL, jsonResponse, mockFetch } from './helpers/testUtils';

const SAMPLE_MEDICINES = [
  {
    _id: 'med-1',
    name: 'Amoxicillin',
    quantity: 5,
    expiryDate: '2027-05-10T00:00:00.000Z',
    price: 12.5,
  },
  {
    _id: 'med-2',
    name: 'Paracetamol',
    quantity: 40,
    expiryDate: '2028-01-20T00:00:00.000Z',
    price: 3,
  },
];

describe('DashboardPage', () => {
  it('shows loading spinner, renders medicines with low-stock highlight, and filters via search', async () => {
    const user = userEvent.setup();
    let resolveMeds;
    const medsPromise = new Promise((resolve) => {
      resolveMeds = resolve;
    });

    mockFetch({
      'GET /medicines': () => medsPromise,
    });

    render(<DashboardPage token="test-token" />);

    expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
    resolveMeds(jsonResponse(SAMPLE_MEDICINES));

    expect(await screen.findByText('Amoxicillin')).toBeInTheDocument();
    expect(screen.getByText('2027-05-10')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('$3.00')).toBeInTheDocument();

    const lowStockCell = screen.getByText('5');
    expect(lowStockCell).toHaveClass('text-red-600', 'font-bold');

    const healthyStockCell = screen.getByText('40');
    expect(healthyStockCell).toHaveClass('text-gray-500');
    expect(healthyStockCell).not.toHaveClass('text-red-600');

    const searchInput = screen.getByPlaceholderText('Search medicines...');
    await user.type(searchInput, 'para');
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'nonexistent');
    expect(screen.getByText('No medicines found matching your search.')).toBeInTheDocument();
  });

  it('allows adding a new medicine and editing an existing medicine', async () => {
    const user = userEvent.setup();
    let currentMeds = [...SAMPLE_MEDICINES];

    const fetchSpy = mockFetch({
      'GET /medicines': () => jsonResponse(currentMeds),
      'POST /medicines': (_url, options) => {
        const body = JSON.parse(options.body);
        currentMeds = [
          ...currentMeds,
          { _id: 'med-3', ...body, expiryDate: `${body.expiryDate}T00:00:00.000Z` },
        ];
        return jsonResponse({ message: 'Medicine added' }, { status: 201 });
      },
      'PUT /medicines/med-1': (_url, options) => {
        const body = JSON.parse(options.body);
        currentMeds = currentMeds.map((m) =>
          m._id === 'med-1' ? { ...m, ...body, expiryDate: `${body.expiryDate}T00:00:00.000Z` } : m
        );
        return jsonResponse({ message: 'Medicine updated' });
      },
    });

    render(<DashboardPage token="owner-jwt" />);
    await screen.findByText('Amoxicillin');

    // Open Add form, verify Cancel hides it, then reopen and submit
    await user.click(screen.getByRole('button', { name: '+ Add New Medicine' }));
    expect(screen.getByRole('heading', { name: 'Add New Medicine' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add New Medicine' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add New Medicine' }));
    await user.type(screen.getByLabelText('Name'), 'Cetirizine');
    await user.type(screen.getByLabelText(/Price/i), '8.75');
    await user.type(screen.getByLabelText('Quantity'), '22');
    await user.type(screen.getByLabelText('Expiry Date'), '2027-09-01');
    await user.click(screen.getByRole('button', { name: 'Save Medicine' }));

    expect(await screen.findByText('Cetirizine')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/medicines`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer owner-jwt',
        },
        body: JSON.stringify({
          name: 'Cetirizine',
          price: 8.75,
          quantity: 22,
          expiryDate: '2027-09-01',
        }),
      })
    );

    // Edit Amoxicillin
    const amoxRow = screen.getByText('Amoxicillin').closest('tr');
    await user.click(within(amoxRow).getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('heading', { name: 'Edit Medicine' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText('Name');
    const qtyInput = screen.getByLabelText('Quantity');
    expect(nameInput).toHaveValue('Amoxicillin');
    expect(screen.getByLabelText('Expiry Date')).toHaveValue('2027-05-10');

    await user.clear(qtyInput);
    await user.type(qtyInput, '30');
    await user.click(screen.getByRole('button', { name: 'Save Medicine' }));

    await waitFor(() => {
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('opens confirmation modal before deleting and displays error modal when deletion is forbidden', async () => {
    const user = userEvent.setup();
    let currentMeds = [...SAMPLE_MEDICINES];
    let allowDelete = true;

    mockFetch({
      'GET /medicines': () => jsonResponse(currentMeds),
      'DELETE /medicines/med-2': () => {
        if (!allowDelete) {
          return jsonResponse({ message: 'Access denied' }, { status: 403 });
        }
        currentMeds = currentMeds.filter((m) => m._id !== 'med-2');
        return jsonResponse({ message: 'Medicine deleted' });
      },
      'DELETE /medicines/med-1': () => jsonResponse({ message: 'Access denied' }, { status: 403 }),
    });

    render(<DashboardPage token="token" />);
    await screen.findByText('Paracetamol');

    const paraRow = screen.getByText('Paracetamol').closest('tr');
    await user.click(within(paraRow).getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Are you sure you want to delete "Paracetamol"?')).toBeInTheDocument();

    // Cancel first
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();

    // Confirm deletion
    await user.click(within(paraRow).getByRole('button', { name: 'Delete' }));
    const confirmModal = screen.getByText('Confirm Deletion').closest('div.bg-white');
    await user.click(within(confirmModal).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
    });

    // Trigger 403 error modal on Amoxicillin delete
    allowDelete = false;
    const amoxRow = screen.getByText('Amoxicillin').closest('tr');
    await user.click(within(amoxRow).getByRole('button', { name: 'Delete' }));
    const amoxModal = screen.getByText('Confirm Deletion').closest('div.bg-white');
    await user.click(within(amoxModal).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('heading', { name: 'An Error Occurred' })).toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });
});
