import React from 'react';
import RestaurantPOS from './Restaurant'; // The Restaurant POS you just made
// Make sure you have your original Kirana dashboard component ready to import
// import KiranaDashboard from './KiranaDashboard'; 

function Dashboard() {
    // Get the user object you saved in localStorage during login
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // If for some reason there is no user, show an error.
    // (This should be prevented by a ProtectedRoute, but it's a good safeguard).
    if (!user) {
        return <p>Error: User data not found. Please log in again.</p>;
    }

    // This is the "magic switch" that decides which dashboard to show
    switch (user.shop_type) {
        case 'RESTAURANT':
            return <RestaurantPOS user={user} />;
        
        case 'KIRANA':
            // Replace this with your actual Kirana component
            // return <KiranaDashboard user={user} />;
            return <div><h1>Welcome to your Kirana Dashboard!</h1><p>(Your original component goes here)</p></div>;

        case 'ELECTRONICS':
            // Placeholder for when you build the Electronics module
            return <div><h1>Welcome, Electronics Shop Owner!</h1><p>Your dashboard is coming soon.</p></div>;

        default:
            // A fallback for any other shop types or errors
            return <div><h1>Welcome, {user.name}!</h1></div>;
    }
}

export default Dashboard;