import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import all your components
import Login from './components/Login';
import SignUp from './components/SignUp';
import RestaurantLayout from './components/restaurant';

// Import the public-facing menu component
import CustomerMenu from './components/customer_view/CustomerMenu';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public-facing routes for authentication */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                
                {/* --- This is the new route for the public menu --- */}
                <Route path="/customer/menu" element={<CustomerMenu />} />
                
                {/* Authenticated route for the restaurant dashboard */}
                {/* All dashboard pages will be nested under this path */}
                <Route path="/restaurant/*" element={<RestaurantLayout />} />

                {/* Redirect users to the login page by default */}
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}