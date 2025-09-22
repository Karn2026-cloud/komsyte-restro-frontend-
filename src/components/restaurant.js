import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import API from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Import all necessary page components ---
import MenuManagement from './MenuManagement'; 
import KDS from './KDS';
import Reports from './Restaurantreport';
import TableManagement from './tableManagement';
import Profile from './Profile';
import AdvancedRestaurantPOS from './RestaurantPOS'; 

// --- Import CSS and Assets ---
import './Restaurant.css';
import komsyteLogo from '../assets/komsyte-logo.jpg';
import { FaBars, FaTimes } from 'react-icons/fa';

// --- Main Layout Component for all Restaurant routes ---
export default function RestaurantLayout() {
    const navigate = useNavigate();
    const [fullUserData, setFullUserData] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Mapping a URL path to a display name for the header
    const RESTAURANT_MENU_ITEMS = {
        'pos': 'Point of Sale',
        'menu': 'Menu Management',
        'kds': 'Kitchen Display System',
        'tables': 'Table & QR Codes',
        'reports': 'Reports & Analytics',
        'profile': 'My Profile'
    };

    const getActiveMenuKey = () => {
        const path = location.pathname.split('/')[2];
        return path || 'pos';
    };

    const fetchUserData = useCallback(async () => {
        try {
            const { data } = await API.get('/api/Profile');
            setFullUserData(data);
        } catch (err) {
            // If fetching user data fails, it likely means the token is invalid.
            localStorage.removeItem('token');
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
    };

    // If user data is still loading, show a loading message
    if (!fullUserData) {
        return <div className="loading-container">Loading restaurant data...</div>;
    }

    return (
        <div className="restaurant-dashboard">
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src={komsyteLogo} alt="Komsyte Logo" className="sidebar-logo" />
                    <h1 className="sidebar-title">Komsyte POS</h1>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li><Link to="/restaurant/pos" className={getActiveMenuKey() === 'pos' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>Point of Sale</Link></li>
                        <li><Link to="/restaurant/menu" className={getActiveMenuKey() === 'menu' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>Menu Management</Link></li>
                        <li><Link to="/restaurant/kds" className={getActiveMenuKey() === 'kds' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>Kitchen Display System</Link></li>
                        <li><Link to="/restaurant/tables" className={getActiveMenuKey() === 'tables' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>Table & QR Codes</Link></li>
                        <li><Link to="/restaurant/reports" className={getActiveMenuKey() === 'reports' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>Reports</Link></li>
                        <li><Link to="/restaurant/profile" className={getActiveMenuKey() === 'profile' ? 'active' : ''} onClick={() => setSidebarOpen(false)}>My Profile</Link></li>
                    </ul>
                </nav>
            </aside>
            <div className="main-panel">
                <header className="main-header">
                    <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <h2 className="header-title">
                        {RESTAURANT_MENU_ITEMS[getActiveMenuKey()]}
                    </h2>
                    <div className="header-user-info">
                        <span>
                            Welcome, <strong>{fullUserData?.restaurantId?.shopName || 'Owner'}</strong>
                        </span>
                        <button className="logout-button-header" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </header>
                <main className="main-content">
                    <Routes>
                        <Route path="pos" element={<AdvancedRestaurantPOS user={fullUserData} />} />
                        <Route path="menu" element={<MenuManagement user={fullUserData} />} />
                        <Route path="kds" element={<KDS user={fullUserData} />} />
                        <Route path="tables" element={<TableManagement user={fullUserData} />} />
                        <Route path="reports" element={<Reports user={fullUserData} />} />
                        <Route path="profile" element={<Profile user={fullUserData} />} /> 
                        <Route index element={<Navigate to="pos" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}