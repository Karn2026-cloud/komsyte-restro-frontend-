// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your components
import Login from './components/Login';
import Signup from './components/Signup';
import Restaurant from './components/Restaurant';
import CustomerMenu from './components/customer_view/CustomerMenu';

// You might also have a landing page or homepage component
import HomePage from './components/HomePage';

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes accessible without authentication */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* The new, public route for customers scanning the QR code */}
                <Route path="/menu" element={<CustomerMenu />} />

                {/* Authenticated/Private Route for the Restaurant Dashboard */}
                {/* All routes inside this are only accessible to logged-in users */}
                <Route path="/restaurant/*" element={<Restaurant />} />

                {/* Redirect any unmatched routes to the login page as a fallback */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;
