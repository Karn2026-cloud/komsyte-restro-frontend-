import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api.js';
import './style.css'; // Assuming you have a style.css for auth pages

export default function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await API.post('/api/login', formData);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            const userRole = data.user.role;
            
            // ✅ FIX: Corrected the navigation paths to match your main router
            if (userRole === 'Owner' || userRole === 'Manager') {
                navigate('/restaurant/reports'); // Correct path for reports
            } else if (userRole === 'Chef') {
                navigate('/restaurant/kds'); // Correct path for KDS
            } else { // Waiter, Cashier, Staff
                navigate('/restaurant/pos'); // Correct path for POS
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="auth-container">
            <div className="auth-form-wrapper">
                <h2 className="auth-title">Welcome Back!</h2>
                <p className="auth-subtitle">Login to your restaurant dashboard.</p>
                <form onSubmit={handleLogin}>
                    <div className="auth-input-group">
                        <label htmlFor="email">Email Address</label>
                        <input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="auth-input-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" placeholder="Your Password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                </form>
                {error && <p className="auth-error-text">{error}</p>}
                <p className="auth-footer-text">
                    Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
                </p>
            </div>
        </div>
    );
}