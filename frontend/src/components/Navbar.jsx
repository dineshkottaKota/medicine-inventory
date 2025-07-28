import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ onLogout }) {
  const activeLinkStyle = {
    backgroundColor: '#2563EB',
    color: 'white',
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <NavLink to="/dashboard" className="text-xl font-bold text-gray-900">
          Med<span className="text-blue-600">Inventory</span>
        </NavLink>
        <div className="flex items-center space-x-4">
          <NavLink 
            to="/dashboard" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
            style={({ isActive }) => isActive ? activeLinkStyle : undefined}
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/sell" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
            style={({ isActive }) => isActive ? activeLinkStyle : undefined}
          >
            Sell Medicine
          </NavLink>
          <NavLink 
            to="/reports" 
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
            style={({ isActive }) => isActive ? activeLinkStyle : undefined}
          >
            Sales Reports
          </NavLink>
          <button onClick={onLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-600">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}