import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

export default function HomePage() {
  const featuresRef = useRef(null);

  // This effect will trigger animations when elements scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    const elements = featuresRef.current.querySelectorAll('.feature-card');
    elements.forEach((el) => observer.observe(el));

    // Cleanup observer on component unmount
    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div className="bg-white text-gray-800 font-sans">
      <header className="absolute top-0 left-0 w-full z-30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">
            Med<span className="text-blue-600">Inventory</span>
          </div>
          <div className="space-x-2 sm:space-x-4">
            <NavLink to="/login" className="text-gray-600 hover:text-blue-600 transition px-2 sm:px-0">Login</NavLink>
            <NavLink to="/register" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition">Register</NavLink>
          </div>
        </div>
      </header>

      <section className="relative bg-gray-50 pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            Intelligent Inventory Management
          </h1>
          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Effortlessly manage your medicine stock, track sales, and view reports. Streamline your pharmacy operations with our modern platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <NavLink to="/register" className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-300">Get Started for Free</NavLink>
            <NavLink to="/login" className="w-full sm:w-auto bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:ring-2 hover:ring-blue-500 transition-all duration-300">Sign In</NavLink>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Why Choose MedInventory?</h2>
            <p className="mt-4 text-gray-600">Everything you need, and more.</p>
          </div>
          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="feature-card text-center p-8 bg-gray-50 rounded-xl shadow-md opacity-0" style={{ transition: 'opacity 0.5s, transform 0.5s' }}>
              <div className="text-4xl text-blue-600 mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">Effortless Tracking</h3>
              <p className="text-gray-600">
                Keep a real-time pulse on your stock levels, expiry dates, and pricing with a clean, intuitive dashboard.
              </p>
            </div>
            <div className="feature-card text-center p-8 bg-gray-50 rounded-xl shadow-md opacity-0" style={{ transition: 'opacity 0.5s, transform 0.5s', animationDelay: '0.2s' }}>
              <div className="text-4xl text-purple-500 mb-4">💡</div>
              <h3 className="text-xl font-bold mb-2">Simple & Intuitive</h3>
              <p className="text-gray-600">
                A clean and modern interface that is easy to use for everyone, from owners to staff members.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2025 MedInventory. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
