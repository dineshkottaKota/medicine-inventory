import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = 'https://medicine-inventory-backend-rkud.onrender.com/api';

export default function DashboardPage({ token }) {
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  
  // --- NEW: State for the search term ---
  const [searchTerm, setSearchTerm] = useState('');

  const formatDateForInput = (isoString) => isoString ? new Date(isoString).toISOString().split('T')[0] : '';

  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/medicines`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch medicines.');
      const data = await response.json();
      setMedicines(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    // ... (rest of the function is unchanged)
    const formData = new FormData(e.target);
    const medicineData = Object.fromEntries(formData.entries());
    medicineData.quantity = parseInt(medicineData.quantity, 10);
    medicineData.price = parseFloat(medicineData.price);

    const isUpdating = !!editingMedicine;
    const url = isUpdating ? `${API_BASE_URL}/medicines/${editingMedicine._id}` : `${API_BASE_URL}/medicines`;
    const method = isUpdating ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(medicineData) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to save medicine.'); }
      closeForm();
      fetchMedicines();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMedicine = async () => {
    // ... (rest of the function is unchanged)
    if (!medicineToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/medicines/${medicineToDelete._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Failed to delete medicine.'); }
      setMedicineToDelete(null);
      fetchMedicines();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const showAddForm = () => { setEditingMedicine(null); setIsFormVisible(true); };
  const showEditForm = (medicine) => { setEditingMedicine(medicine); setIsFormVisible(true); };
  const closeForm = () => { setIsFormVisible(false); setEditingMedicine(null); };

  // --- NEW: Filter medicines based on the search term ---
  const filteredMedicines = useMemo(() => {
    return medicines.filter(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [medicines, searchTerm]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Inventory Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage your medicine stock.</p>
                </div>
            </div>
        </header>
        <main>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            {/* --- NEW: Search Input --- */}
            <div className="w-full sm:w-auto sm:max-w-xs">
              <input 
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={showAddForm} className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              + Add New Medicine
            </button>
          </div>
          {isFormVisible && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
              {/* Form content remains the same */}
              <h2 className="text-2xl font-bold mb-4">{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              <form onSubmit={handleSaveMedicine}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2"><label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label><input type="text" id="name" name="name" defaultValue={editingMedicine?.name} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
                  <div><label htmlFor="price" className="block text-sm font-medium text-gray-700">Price ($)</label><input type="number" id="price" name="price" step="0.01" min="0" defaultValue={editingMedicine?.price} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
                  <div><label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label><input type="number" id="quantity" name="quantity" min="0" defaultValue={editingMedicine?.quantity} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
                  <div className="md:col-span-2"><label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Expiry Date</label><input type="date" id="expiryDate" name="expiryDate" defaultValue={formatDateForInput(editingMedicine?.expiryDate)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
                </div>
                <div className="flex items-center justify-end mt-6 space-x-4"><button type="button" onClick={closeForm} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button><button type="submit" className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">Save Medicine</button></div>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th><th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th><th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th><th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{isLoading ? (<tr><td colSpan="5"><LoadingSpinner message="Loading medicines..." /></td></tr>) : filteredMedicines.length > 0 ? (filteredMedicines.map(med => (<tr key={med._id} className="hover:bg-gray-50"><td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{med.name}</td><td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateForInput(med.expiryDate)}</td><td className={`px-2 sm:px-6 py-4 whitespace-nowrap text-sm ${med.quantity <= 10 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{med.quantity}</td><td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">${med.price.toFixed(2)}</td><td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2"><button onClick={() => showEditForm(med)} className="text-indigo-600 hover:text-indigo-900">Edit</button><button onClick={() => setMedicineToDelete(med)} className="text-red-600 hover:text-red-900">Delete</button></td></tr>))) : (<tr><td colSpan="5" className="text-center p-8 text-gray-500">No medicines found{searchTerm && ' matching your search'}.</td></tr>)}</tbody></table></div></div>
        </main>
        {error && (<Modal onClose={() => setError(null)}><h3 className="text-lg font-bold text-red-600">An Error Occurred</h3><div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap bg-red-50 p-4 rounded-md">{error}</div></Modal>)}
        {medicineToDelete && (<Modal onClose={() => setMedicineToDelete(null)}><h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3><p className="mt-2 text-sm text-gray-600">Are you sure you want to delete "{medicineToDelete.name}"?</p><div className="mt-6 flex justify-end space-x-3"><button onClick={() => setMedicineToDelete(null)} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button><button onClick={handleDeleteMedicine} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">Delete</button></div></Modal>)}
      </div>
    </div>
  );
};
