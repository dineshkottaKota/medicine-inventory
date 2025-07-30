import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    navigate('/');
    onLogout();
  };

  const activeLinkStyle = {
    backgroundColor: '#2563EB',
    color: 'white',
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink to="/dashboard" className="text-xl font-bold text-gray-900">
              Med<span className="text-blue-600">Inventory</span>
            </NavLink>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Dashboard</NavLink>
            <NavLink to="/sell" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Sell Medicine</NavLink>
            <NavLink to="/reports" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Sales Reports</NavLink>
            <button onClick={handleLogoutClick} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-600">Logout</button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-200 focus:outline-none">
              <span className="sr-only">Open main menu</span>
              {/* Icon for menu (hamburger) */}
              <svg className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon for close (X) */}
              <svg className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <NavLink to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Dashboard</NavLink>
          <NavLink to="/sell" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Sell Medicine</NavLink>
          <NavLink to="/reports" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200" style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Sales Reports</NavLink>
          <button onClick={handleLogoutClick} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-100">Logout</button>
        </div>
      </div>
    </nav>
  );
}
