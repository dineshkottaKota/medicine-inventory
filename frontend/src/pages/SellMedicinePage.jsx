import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = 'https://medicine-inventory-backend-rkud.onrender.com/api';

export default function SellMedicinePage({ token }) {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  
  // --- NEW: State for the search term ---
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMedicines = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/medicines`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch medicines.');
      const data = await response.json();
      setMedicines(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleAddItemToCart = (e) => {
    e.preventDefault();
    // ... (rest of the function is unchanged)
    setError(null);
    const quantity = parseInt(quantityToAdd, 10);
    if (!selectedMedicineId || isNaN(quantity) || quantity <= 0) {
      setError("Please select a medicine and enter a valid quantity.");
      return;
    }
    const medicineDetails = medicines.find(m => m._id === selectedMedicineId);
    if (!medicineDetails) return;
    const existingCartItem = cart.find(item => item.medicineId === selectedMedicineId);
    const currentQuantityInCart = existingCartItem ? existingCartItem.quantitySold : 0;
    if (quantity + currentQuantityInCart > medicineDetails.quantity) {
      setError(`Not enough stock for ${medicineDetails.name}. Only ${medicineDetails.quantity} available.`);
      return;
    }
    if (existingCartItem) {
      setCart(cart.map(item => item.medicineId === selectedMedicineId ? { ...item, quantitySold: item.quantitySold + quantity } : item));
    } else {
      setCart([...cart, { medicineId: medicineDetails._id, name: medicineDetails.name, price: medicineDetails.price, quantitySold: quantity, maxQuantity: medicineDetails.quantity }]);
    }
    setSelectedMedicineId('');
    setQuantityToAdd(1);
    setSearchTerm(''); // Clear search after adding
  };

  const handleRemoveItem = (medicineId) => {
    setCart(cart.filter(item => item.medicineId !== medicineId));
  };

  const handleRecordSale = async () => {
    // ... (rest of the function is unchanged)
    if (cart.length === 0) {
      setError("Cannot record an empty sale. Please add items to the list.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    const saleItems = cart.map(({ medicineId, quantitySold }) => ({ medicineId, quantitySold }));
    try {
      const response = await fetch(`${API_BASE_URL}/sales/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sales: saleItems })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to process sale.');
      setSuccess(`Sale recorded successfully!`);
      setCart([]);
      fetchMedicines();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantitySold), 0);
  }, [cart]);

  // --- NEW: Filter medicines for the dropdown ---
  const filteredMedicinesForSale = useMemo(() => {
    return medicines.filter(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [medicines, searchTerm]);

  const selectedMedicineForForm = medicines.find(m => m._id === selectedMedicineId);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sell Medicine</h1>
          <p className="text-gray-600 mt-1">Add multiple medicines to create a new sale.</p>
        </header>
        
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg mb-8">
          <form onSubmit={handleAddItemToCart} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-3">
              {/* --- NEW: Search Input for Dropdown --- */}
              <label htmlFor="search-medicine" className="block text-sm font-medium text-gray-700 mb-1">Search for a Medicine</label>
              <input 
                type="text"
                id="search-medicine"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="medicine" className="block text-sm font-medium text-gray-700 mb-1">Select from Results</label>
              <select id="medicine" value={selectedMedicineId} onChange={(e) => setSelectedMedicineId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled>-- Choose a medicine --</option>
                {filteredMedicinesForSale.map(med => (
                  <option key={med._id} value={med._id} disabled={med.quantity === 0}>
                    {med.name} (In Stock: {med.quantity})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" id="quantity" value={quantityToAdd} onChange={(e) => setQuantityToAdd(e.target.value)} min="1" max={selectedMedicineForForm?.quantity || 1} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!selectedMedicineId} />
            </div>
            <button type="submit" disabled={!selectedMedicineId} className="sm:col-start-3 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400">Add to Sale</button>
          </form>
        </div>

        <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
          {/* Cart/Sale table remains the same */}
          <h2 className="text-2xl font-bold mb-4">Current Sale</h2>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{cart.length === 0 && <tr><td colSpan="5" className="text-center p-8 text-gray-500">No items added yet.</td></tr>}{cart.map(item => (<tr key={item.medicineId}><td className="px-4 py-4 whitespace-nowrap text-sm font-medium">{item.name}</td><td className="px-4 py-4 whitespace-nowrap text-sm">{item.quantitySold}</td><td className="px-4 py-4 whitespace-nowrap text-sm">${item.price.toFixed(2)}</td><td className="px-4 py-4 whitespace-nowrap text-sm font-bold">${(item.price * item.quantitySold).toFixed(2)}</td><td className="px-4 py-4 whitespace-nowrap text-center text-sm"><button onClick={() => handleRemoveItem(item.medicineId)} className="text-red-600 hover:text-red-800">Remove</button></td></tr>))}</tbody></table></div>
          <div className="mt-6 flex justify-end items-center"><div className="text-right"><p className="text-lg font-medium text-gray-600">Total Amount:</p><p className="text-3xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p></div></div>
          <div className="mt-6 border-t pt-6"><button onClick={handleRecordSale} disabled={isLoading || cart.length === 0} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-green-400 transition duration-200">{isLoading ? 'Processing Sale...' : 'Record Final Sale'}</button></div>
        </div>
        {error && (<div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mt-4" role="alert"><strong className="font-bold">Error: </strong><span>{error}</span></div>)}
        {success && (<div className="max-w-4xl mx-auto bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mt-4" role="alert"><strong className="font-bold">Success: </strong><span>{success}</span></div>)}
      </div>
    </div>
  );
}
