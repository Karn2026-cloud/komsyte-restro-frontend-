import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- Correctly import all necessary components ---
import Login from './components/Login.js';
import SignUp from './components/SignUp.js';
import RestaurantLayout from './components/restaurant.js';
// --- ADDED: Import the new customer menu component ---
import CustomerMenu from './components/customer_view/CustomerMenu.js'; 

// This is a helper component to protect routes that require a user to be logged in
const PrivateRoute = ({ children }) => {
    // Check if a login token exists in the browser's local storage
    const token = localStorage.getItem('token');
    
    // If a token exists, show the requested page. If not, redirect to the login page.
    return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- NEW: Public route for customers to view the menu after scanning a QR code --- */}
        <Route path="/menu" element={<CustomerMenu />} />

        {/* Route for the Login page */}
        <Route path="/login" element={<Login />} />

        {/* Route for the Signup page */}
        <Route path="/signup" element={<SignUp />} />
        
        {/* This is the main route for your entire restaurant application */}
        {/* It is wrapped in PrivateRoute to ensure only logged-in users can access it */}
        <Route 
          path="/restaurant/*" 
          element={
            <PrivateRoute>
              <RestaurantLayout />
            </PrivateRoute>
          } 
        />
        
        {/* --- UPDATED: Default route logic --- */}
        {/* If a user is logged in, redirect them to the POS, otherwise to the login page. */}
        <Route 
          path="/" 
          element={
            localStorage.getItem('token') 
              ? <Navigate to="/restaurant/pos" replace /> 
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;