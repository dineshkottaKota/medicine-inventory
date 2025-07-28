import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import all the page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SellMedicinePage from './pages/SellMedicinePage';
import ReportsPage from './pages/ReportsPage';
import Navbar from './components/Navbar';

// A wrapper for routes that require authentication
const PrivateRoute = ({ children, token }) => {
  return token ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  return (
    <Router>
      {token && <Navbar onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <HomePage />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={<PrivateRoute token={token}><DashboardPage token={token} /></PrivateRoute>} 
        />
        <Route 
          path="/sell" 
          element={<PrivateRoute token={token}><SellMedicinePage token={token} /></PrivateRoute>} 
        />
        <Route 
          path="/reports" 
          element={<PrivateRoute token={token}><ReportsPage token={token} /></PrivateRoute>} 
        />

        {/* Redirect any unknown routes to the home page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}