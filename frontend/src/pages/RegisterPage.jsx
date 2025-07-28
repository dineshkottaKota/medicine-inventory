import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Registration failed.');
            setSuccess('Registration successful! You can now log in.');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Create an Account</h2>
                <p className="text-center text-gray-600 mb-8">Join the inventory system</p>
                <form onSubmit={handleRegister}>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Username</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email Address</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                    <div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">Role</label><select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="staff">Staff</option><option value="owner">Owner</option></select></div>
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-200">{isLoading ? 'Registering...' : 'Register'}</button>
                </form>
                <p className="text-center text-sm text-gray-600 mt-6">Already have an account? <NavLink to="/login" className="font-medium text-blue-600 hover:text-blue-500">Login here</NavLink></p>
            </div>
            {error && (<div className="max-w-md w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mt-4" role="alert"><strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span></div>)}
            {success && (<div className="max-w-md w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mt-4" role="alert"><strong className="font-bold">Success: </strong><span className="block sm:inline">{success}</span></div>)}
        </div>
    );
};