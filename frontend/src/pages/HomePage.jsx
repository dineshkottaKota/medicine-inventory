import React from 'react';
import { NavLink } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="bg-white text-gray-800 font-sans">
      <header className="absolute top-0 left-0 w-full z-30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">Med<span className="text-blue-600">Inventory</span></div>
          <div className="space-x-2 sm:space-x-4">
            <NavLink to="/login" className="text-gray-600 hover:text-blue-600 transition px-2 sm:px-0">Login</NavLink>
            <NavLink to="/register" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition">Register</NavLink>
          </div>
        </div>
      </header>
      <section className="relative bg-gray-50 pt-32 pb-20 lg:pt-48 lg:pb-28">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">Intelligent Inventory Management</h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Effortlessly manage your medicine stock, track sales, and view reports. Streamline your pharmacy operations with our modern platform.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <NavLink to="/register" className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-300">Get Started for Free</NavLink>
            <NavLink to="/login" className="w-full sm:w-auto bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:ring-2 hover:ring-blue-500 transition-all duration-300">Sign In</NavLink>
          </div>
        </div>
      </section>
    </div>
  );
};