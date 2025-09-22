import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import './style.css'; // Assuming you have a style.css for auth pages

export default function SignUp() {
    const [formData, setFormData] = useState({ shopName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await API.post('/api/signup', formData);
            alert('Signup successful! Please log in.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form-wrapper">
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Start managing your restaurant efficiently.</p>
                <form onSubmit={handleSignup}>
                    <div className="auth-input-group">
                        <label htmlFor="shopName">Restaurant Name</label>
                        <input id="shopName" name="shopName" type="text" placeholder="e.g., The Grand Bistro" value={formData.shopName} onChange={handleChange} required />
                    </div>
                    <div className="auth-input-group">
                        <label htmlFor="email">Email Address</label>
                        <input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="auth-input-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" placeholder="Min. 6 characters" value={formData.password} onChange={handleChange} required minLength={6}/>
                    </div>
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Creating Account...' : 'Sign Up for Free'}
                    </button>
                </form>
                {error && <p className="auth-error-text">{error}</p>}
                <p className="auth-footer-text">
                    Already have an account? <Link to="/login" className="auth-link">Login here</Link>
                </p>
            </div>
        </div>
    );
}