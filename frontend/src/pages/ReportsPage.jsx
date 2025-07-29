import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = 'https://medicine-inventory-backend-rkud.onrender.com/api';

export default function ReportsPage({ token }) {
  const [reportData, setReportData] = useState([]); 
  const [period, setPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for custom date pickers
  const [showDatePickers, setShowDatePickers] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAggregatedReport = async (reportType) => {
    setShowDatePickers(false); // Hide date pickers when clicking other buttons
    setIsLoading(true);
    setError(null);
    setReportData([]);
    setPeriod(reportType);

    try {
      const response = await fetch(`${API_BASE_URL}/sales/report?type=${reportType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${reportType} report.`);
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomReportFetch = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData([]);
    setPeriod('custom');

    try {
      // New endpoint for custom date range
      const response = await fetch(`${API_BASE_URL}/sales/report/custom?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch custom report.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomButtonClick = () => {
    setPeriod('custom');
    setShowDatePickers(true);
    setReportData([]); // Clear previous report data
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600 mt-1">View sales data for different periods or a custom range.</p>
        </header>
        
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
          <button onClick={() => fetchAggregatedReport('daily')} className={`font-semibold py-2 px-6 rounded-lg ${period === 'daily' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>Daily</button>
          <button onClick={() => fetchAggregatedReport('weekly')} className={`font-semibold py-2 px-6 rounded-lg ${period === 'weekly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>Weekly</button>
          <button onClick={() => fetchAggregatedReport('monthly')} className={`font-semibold py-2 px-6 rounded-lg ${period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>Monthly</button>
          <button onClick={handleCustomButtonClick} className={`font-semibold py-2 px-6 rounded-lg ${period === 'custom' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}>Custom</button>
        </div>
        
        {showDatePickers && (
          <form onSubmit={handleCustomReportFetch} className="max-w-xl mx-auto bg-white p-4 rounded-lg shadow-md mb-8 flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-600">Start Date</label>
              <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md"/>
            </div>
            <div className="w-full">
              <label htmlFor="endDate" className="text-sm font-medium text-gray-600">End Date</label>
              <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md"/>
            </div>
            <button type="submit" className="w-full sm:w-auto mt-2 sm:mt-6 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Fetch</button>
          </form>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg">
          {isLoading && <LoadingSpinner message={`Fetching report...`} />}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          {!isLoading && !error && period && (
            <div>
              <h2 className="text-2xl font-bold mb-4 capitalize">{period} Sales Report</h2>
              {reportData.length > 0 ? (
                <div className="overflow-x-auto">
                  {period === 'custom' ? (
                    // Table for individual sales records
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((item) => (
                          <tr key={item._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.medicineName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantitySold}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    // Table for aggregated daily/weekly/monthly reports
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Sold</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item._id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.totalSales.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalQuantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 mt-4">No sales data found for this period.</p>
              )}
            </div>
          )}

          {!isLoading && !period && !error && (
            <p className="text-center text-gray-500">Select a period to view a report.</p>
          )}
        </div>
      </div>
    </div>
  );
}
