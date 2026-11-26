import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SellMedicinePage from '../../frontend/src/pages/SellMedicinePage';
import { API_BASE_URL, jsonResponse, mockFetch } from './helpers/testUtils';

const INVENTORY = [
  { _id: 'm1', name: 'Paracetamol', quantity: 5, price: 4.5 },
  { _id: 'm2', name: 'Ibuprofen', quantity: 10, price: 6.0 },
  { _id: 'm3', name: 'ZeroStockMed', quantity: 0, price: 15.0 },
];

describe('SellMedicinePage', () => {
  it('filters dropdown, disables out-of-stock options, merges cart items, validates stock, and removes items', async () => {
    const user = userEvent.setup();
    mockFetch({
      'GET /medicines': jsonResponse(INVENTORY),
    });

    render(<SellMedicinePage token="staff-jwt" />);

    const select = screen.getByLabelText(/Select from Results/i);
    await screen.findByRole('option', { name: 'Paracetamol (In Stock: 5)' });

    const outOfStockOption = screen.getByRole('option', { name: 'ZeroStockMed (In Stock: 0)' });
    expect(outOfStockOption).toBeDisabled();

    const qtyInput = screen.getByLabelText(/^Quantity$/i);
    const addBtn = screen.getByRole('button', { name: 'Add to Sale' });
    const recordBtn = screen.getByRole('button', { name: 'Record Final Sale' });
    expect(qtyInput).toBeDisabled();
    expect(addBtn).toBeDisabled();
    expect(recordBtn).toBeDisabled();

    // Filter dropdown with search input
    const searchInput = screen.getByLabelText(/Search for a Medicine/i);
    await user.type(searchInput, 'para');
    expect(screen.getByRole('option', { name: 'Paracetamol (In Stock: 5)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ibuprofen (In Stock: 10)' })).not.toBeInTheDocument();

    // Add 2 Paracetamol
    await user.selectOptions(select, 'm1');
    expect(qtyInput).toBeEnabled();
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');
    await user.click(addBtn);

    expect(searchInput).toHaveValue('');
    expect(select).toHaveValue('');
    expect(qtyInput).toHaveValue(1);
    expect(screen.getByText('$9.00', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('$9.00', { selector: 'p' })).toBeInTheDocument();

    // Add 2 more Paracetamol -> merges into single row (qty 4, subtotal $18.00)
    await user.selectOptions(select, 'm1');
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');
    await user.click(addBtn);

    const paraCell = screen.getByText('Paracetamol', { selector: 'td' });
    const paraRow = paraCell.closest('tr');
    expect(within(paraRow).getByText('4')).toBeInTheDocument();
    expect(within(paraRow).getByText('$18.00')).toBeInTheDocument();

    // Attempt to add 2 more (4 + 2 > 5 stock) -> stock validation error
    await user.selectOptions(select, 'm1');
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');
    await user.click(addBtn);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Not enough stock for Paracetamol. Only 5 available.');

    // Remove item from cart
    await user.click(within(paraRow).getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('No items added yet.')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('submits bulk sale, clears cart, refreshes inventory, and handles API errors', async () => {
    const user = userEvent.setup();
    let shouldFailSale = true;
    let resolveSale;

    const fetchSpy = mockFetch({
      'GET /medicines': () => jsonResponse(INVENTORY),
      'POST /sales/bulk': () => {
        if (shouldFailSale) {
          return jsonResponse({ message: 'Server error during bulk sale' }, { status: 500 });
        }
        return new Promise((resolve) => {
          resolveSale = resolve;
        });
      },
    });

    render(<SellMedicinePage token="staff-jwt" />);
    const select = screen.getByLabelText(/Select from Results/i);
    await screen.findByRole('option', { name: 'Paracetamol (In Stock: 5)' });

    await user.selectOptions(select, 'm1');
    await user.clear(screen.getByLabelText(/^Quantity$/i));
    await user.type(screen.getByLabelText(/^Quantity$/i), '2');
    await user.click(screen.getByRole('button', { name: 'Add to Sale' }));

    await user.selectOptions(select, 'm2');
    await user.clear(screen.getByLabelText(/^Quantity$/i));
    await user.type(screen.getByLabelText(/^Quantity$/i), '3');
    await user.click(screen.getByRole('button', { name: 'Add to Sale' }));

    expect(screen.getByText('$27.00')).toBeInTheDocument();

    // First attempt fails -> error shown, cart preserved
    await user.click(screen.getByRole('button', { name: 'Record Final Sale' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error during bulk sale');
    expect(screen.getByText('$27.00')).toBeInTheDocument();

    // Second attempt succeeds
    shouldFailSale = false;
    await user.click(screen.getByRole('button', { name: 'Record Final Sale' }));
    expect(screen.getByRole('button', { name: 'Processing Sale...' })).toBeDisabled();

    resolveSale(jsonResponse({ message: 'Bulk sale recorded successfully' }, { status: 201 }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Sale recorded successfully!');
    });
    expect(screen.getByText('No items added yet.')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/sales/bulk`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-jwt',
        },
        body: JSON.stringify({
          sales: [
            { medicineId: 'm1', quantitySold: 2 },
            { medicineId: 'm2', quantitySold: 3 },
          ],
        }),
      })
    );
  });
});
