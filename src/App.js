// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* This is the new, public route for customers */}
                <Route path="/menu" element={<CustomerMenu />} />

                {/* Authenticated/Private Route for the Restaurant Dashboard */}
                {/* All routes inside this are only accessible to logged-in users */}
                <Route path="/restaurant/*" element={<Restaurant />} />
            </Routes>
        </Router>
    );
}

export default App;
