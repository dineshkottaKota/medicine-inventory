import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReportsPage from '../../frontend/src/pages/ReportsPage';
import { API_BASE_URL, jsonResponse, mockFetch } from './helpers/testUtils';

describe('ReportsPage', () => {
  it('fetches and displays daily, weekly, and monthly aggregated reports and empty states', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({
      [`GET ${API_BASE_URL}/sales/report?type=daily`]: jsonResponse([
        { _id: '2026-11-26', totalSales: 125.5, totalQuantity: 10, count: 3 },
      ]),
      [`GET ${API_BASE_URL}/sales/report?type=weekly`]: jsonResponse([
        { _id: '2026-11-22 to 2026-11-28', totalSales: 310, totalQuantity: 25, count: 8 },
      ]),
      [`GET ${API_BASE_URL}/sales/report?type=monthly`]: jsonResponse([]),
    });

    render(<ReportsPage token="owner-jwt" />);
    expect(screen.getByText('Select a period to view a report.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Daily' }));
    expect(await screen.findByRole('heading', { name: 'daily Sales Report' })).toBeInTheDocument();
    expect(screen.getByText('2026-11-26')).toBeInTheDocument();
    expect(screen.getByText('$125.50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Weekly' }));
    expect(await screen.findByText('2026-11-22 to 2026-11-28')).toBeInTheDocument();
    expect(screen.getByText('$310.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(await screen.findByText('No sales data found for this period.')).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_BASE_URL}/sales/report?type=daily`,
      expect.objectContaining({ headers: { Authorization: 'Bearer owner-jwt' } })
    );
  });

  it('validates custom date range inputs and renders custom individual sales table', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({
      [`GET ${API_BASE_URL}/sales/report/custom?startDate=2026-11-01&endDate=2026-11-26`]: jsonResponse([
        {
          _id: 's1',
          date: '2026-11-25T10:00:00.000Z',
          medicineName: 'Amoxicillin',
          quantitySold: 4,
          totalPrice: 34,
        },
      ]),
    });

    render(<ReportsPage token="owner-jwt" />);

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    const startInput = screen.getByLabelText('Start Date');
    const endInput = screen.getByLabelText('End Date');

    // Submitting without dates shows client-side validation error without calling fetch
    await user.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(screen.getByText('Please select both a start and end date.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.type(startInput, '2026-11-01');
    await user.type(endInput, '2026-11-26');
    await user.click(screen.getByRole('button', { name: 'Fetch' }));

    expect(await screen.findByRole('heading', { name: 'custom Sales Report' })).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('$34.00')).toBeInTheDocument();
  });

  it('displays error message when report endpoint returns non-OK status (e.g. 403 for staff)', async () => {
    const user = userEvent.setup();
    mockFetch({
      [`GET ${API_BASE_URL}/sales/report?type=daily`]: jsonResponse(
        { message: 'Access denied' },
        { status: 403 }
      ),
    });

    render(<ReportsPage token="staff-jwt" />);
    await user.click(screen.getByRole('button', { name: 'Daily' }));

    expect(await screen.findByText('Failed to fetch daily report.')).toBeInTheDocument();
  });
});
