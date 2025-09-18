import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './KDS.css';

export default function KDS() {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [error, setError] = useState('');

    const fetchKitchenOrders = useCallback(async () => {
        try {
            const response = await API.get('/api/kds');
            // This logic correctly filters to only show items that need kitchen attention
            const groupedOrders = response.data.map(order => ({
                ...order,
                items: order.items.filter(item => ['Sent to Kitchen', 'Preparing'].includes(item.status))
            })).filter(order => order.items.length > 0);
            
            setKitchenOrders(groupedOrders);
        } catch (err) {
            setError('Failed to fetch kitchen orders.');
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchKitchenOrders();
        // Set up a polling mechanism to refresh the KDS every 15 seconds
        const interval = setInterval(fetchKitchenOrders, 15000); 
        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [fetchKitchenOrders]);

    const handleStatusUpdate = async (orderId, itemId, currentStatus) => {
        // Defines the next state for an item: Sent to Kitchen -> Preparing -> Ready
        const nextStatus = currentStatus === 'Sent to Kitchen' ? 'Preparing' : 'Ready';
        try {
            await API.put(`/api/orders/${orderId}/item/${itemId}`, { status: nextStatus });
            // The item will turn green (if visible) and then disappear on the next fetchKitchenOrders
            fetchKitchenOrders(); // Immediately refresh the KDS view after an update
        } catch (err) {
            setError('Failed to update status.');
        }
    };
    return (
        <div className="kds-container">
            <div className="kds-header">
                <h1>Kitchen Display System</h1>
            </div>
            {error && <p className="kds-error">{error}</p>}
            <div className="kds-orders-grid">
                {kitchenOrders.length > 0 ? kitchenOrders.map(order => (
                    <div key={order._id} className="kot-ticket">
                        <div className="kot-header">
                            {/* --- ✅ CORRECTED LOGIC HERE --- */}
                            {/* This now correctly displays the table name for BOTH Dine-In and Dine-In-QR orders */}
                            <h4>
                                {['Dine-In', 'Dine-In-QR'].includes(order.orderType) 
                                    ? order.tableId?.name || 'Guest' 
                                    : order.orderType}
                            </h4>
                            <span>KOT #{order.kotNumber || ''}</span>
                        </div>
                        <ul className="kot-items-list">
                            {order.items.map(item => (
                                <li 
                                    key={item._id} 
                                    className={`kot-item status-${item.status.toLowerCase().replace(' ', '-')}`}
                                    onClick={() => handleStatusUpdate(order._id, item._id, item.status)}
                                >
                                    <span className="item-qty">{item.quantity}x</span>
                                    <span className="item-name">{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )) : <p className="no-orders-message">No Active Orders for the Kitchen</p>}
            </div>
        </div>
    );
}