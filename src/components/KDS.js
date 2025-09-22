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
                // ✅ UPDATED: Now includes 'Placed' status so new items appear immediately
                items: order.items.filter(item => ['Placed', 'Sent to Kitchen', 'Preparing'].includes(item.status))
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
        // Defines the next state for an item: Placed -> Sent to Kitchen -> Preparing -> Ready
        let nextStatus;
        if (currentStatus === 'Placed') {
            nextStatus = 'Sent to Kitchen';
        } else if (currentStatus === 'Sent to Kitchen') {
            nextStatus = 'Preparing';
        } else if (currentStatus === 'Preparing') {
            nextStatus = 'Ready';
        } else {
            return; // No further action if already 'Ready'
        }

        try {
            // ✅ CORRECTED: Use the correct parameterized URL for the backend
            await API.put(`/api/orders/item/status`, { orderId, itemId, newStatus: nextStatus });
            // Re-fetch orders to reflect the status change
            fetchKitchenOrders(); 
        } catch (err) {
            setError('Failed to update item status.');
            console.error(err);
        }
    };
    
    return (
        <div className="kds-container">
            {error && <p className="error-message">{error}</p>}
            <h1>Kitchen Display System</h1>
            <div className="kitchen-orders-grid">
                {kitchenOrders.length > 0 ? (
                    kitchenOrders.map(order => (
                        <div key={order._id} className="kot-card">
                            <div className="kot-header">
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
                    ))
                ) : <p className="no-orders-message">No Active Orders for the Kitchen</p>}
            </div>
        </div>
    );
}