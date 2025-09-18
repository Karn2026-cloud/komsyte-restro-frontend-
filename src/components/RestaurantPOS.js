import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import './RestaurantPOS.css';

export default function RestaurantPOS() {
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tablesRes, menuRes, activeOrdersRes] = await Promise.all([
                API.get('/api/tables'),
                API.get('/api/menu'),
                API.get('/api/orders/active')
            ]);
            setTables(tablesRes.data);
            setMenuItems(menuRes.data);
            setActiveOrders(activeOrdersRes.data);
        } catch (err) { setMessage('Error: Could not connect to the server.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleSelectTable = (table) => {
        const existingOrder = activeOrders.find(o => o.tableId?._id === table._id);
        if (existingOrder) {
            setSelectedOrder(existingOrder);
        } else {
            setSelectedOrder({ tableId: table, orderType: 'Dine-In', items: [], isNew: true });
        }
    };

    const handleSelectOrder = (order) => setSelectedOrder(order);

    const handleNewTakeaway = () => {
        setSelectedOrder({ orderType: 'Takeaway', items: [], isNew: true, customerDetails: { name: `Guest ${Date.now() % 1000}` } });
    };

    const addItemToOrder = (menuItem) => {
        if (!selectedOrder) return alert("Please select an order first!");
        setSelectedOrder(prev => {
            const existingItem = prev.items.find(item => item.menuItemId === menuItem._id && item.status === 'New');
            const newItems = existingItem
                ? prev.items.map(item => item.menuItemId === menuItem._id ? { ...item, quantity: item.quantity + 1 } : item)
                : [...prev.items, { menuItemId: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: 1, status: 'New' }];
            return { ...prev, items: newItems };
        });
    };

    const handleQuantityChange = (menuItemId, change) => {
        setSelectedOrder(prev => {
            const newItems = prev.items.map(item => {
                if (item.menuItemId === menuItemId && item.status === 'New') {
                    const newQuantity = item.quantity + change;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
                }
                return item;
            }).filter(Boolean);
            return { ...prev, items: newItems };
        });
    };

    const sendKOT = async () => {
        if (!selectedOrder) return;
        const newItemsForKOT = selectedOrder.items.filter(item => item.status === 'New');
        if (newItemsForKOT.length === 0) return alert("No new items to send.");
        
        try {
            const payload = { 
                items: newItemsForKOT, 
                orderType: selectedOrder.orderType,
                tableId: selectedOrder.tableId?._id,
                customerDetails: selectedOrder.customerDetails,
                existingOrderId: selectedOrder.isNew ? null : selectedOrder._id
            };
            await API.post('/api/orders', payload);
            alert("KOT Sent!");
            fetchData();
            setSelectedOrder(null);
        } catch (err) {
            alert("Failed to send KOT.");
        }
    };

    const finalizeBill = async () => {
        if (!selectedOrder || selectedOrder.isNew) return alert("No active order to bill.");
        try {
            await API.post('/api/bills/finalize', { orderId: selectedOrder._id });
            alert("Bill Finalized!");
            fetchData();
            setSelectedOrder(null);
        } catch (err) {
            alert("Failed to finalize bill.");
        }
    };

    const calculateTotal = () => selectedOrder?.items.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;

    const getGroupedMenu = () => menuItems.reduce((acc, item) => {
        (acc[item.category] = acc[item.category] || []).push(item);
        return acc;
    }, {});

    if (loading) return <div>Loading POS...</div>;

    const groupedMenu = getGroupedMenu();
    const hasNewItems = selectedOrder?.items.some(item => item.status === 'New');

    return (
        <div className="pos-container">
            {/* Left Panel: Tables & Orders */}
            <div className="pos-panel">
                <h3 className="pos-panel-header">Select Order</h3>
                <div className="pos-panel-content">
                    <h4>Dine-In Tables</h4>
                    <div className="tables-grid">
                        {tables.map(table => (
                            <div key={table._id} className={`table-box ${activeOrders.some(o => o.tableId?._id === table._id) ? 'occupied' : 'vacant'} ${selectedOrder?.tableId?._id === table._id ? 'selected' : ''}`} onClick={() => handleSelectTable(table)}>
                                {table.name}
                            </div>
                        ))}
                    </div>
                    <div className="takeaway-section">
                        <h4>Takeaway / Delivery</h4>
                        <button onClick={handleNewTakeaway} className="form-button primary" style={{ width: '100%', marginBottom: '10px' }}>+ New Takeaway</button>
                        {activeOrders.filter(o => o.orderType !== 'Dine-In').map(order => (
                            <div key={order._id} className={`takeaway-order ${selectedOrder?._id === order._id ? 'selected' : ''}`} onClick={() => handleSelectOrder(order)}>
                                {order.customerDetails.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Panel: Menu */}
            <div className="pos-panel">
                <h3 className="pos-panel-header">Menu</h3>
                <div className="pos-panel-content">
                    {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="menu-category">
                            <h4>{category}</h4>
                            <div className="menu-items-grid">
                                {items.map(item => (
                                    <div key={item._id} className="menu-item-card" onClick={() => addItemToOrder(item)}>
                                        <div className="name">{item.name}</div>
                                        <div className="price">₹{item.price}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Current Order */}
            <div className="pos-panel">
                <h3 className="pos-panel-header">Current Order</h3>
                <div className="order-header">
                    {selectedOrder ? (selectedOrder.tableId?.name || selectedOrder.customerDetails?.name || 'New Order') : 'No Order Selected'}
                </div>
                <div className="pos-panel-content" style={{ padding: '0 20px' }}>
                    <table className="order-items-table">
                        <thead>
                            <tr><th>Item</th><th className="order-item-qty">Qty</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {selectedOrder?.items.map((item) => (
                                <tr key={item.menuItemId || item._id}>
                                    <td>{item.name}</td>
                                    <td className="order-item-qty">
                                        {item.status === 'New' ? (
                                            <div className="qty-controls">
                                                <button className="qty-btn" onClick={() => handleQuantityChange(item.menuItemId, -1)}>-</button>
                                                <span>{item.quantity}</span>
                                                <button className="qty-btn" onClick={() => handleQuantityChange(item.menuItemId, 1)}>+</button>
                                            </div>
                                        ) : <span>{item.quantity}</span>}
                                    </td>
                                    <td><span className={`order-item-status status-${item.status}`}>{item.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="order-footer">
                    <div className="order-total">
                        <span>Total</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="order-actions">
                        <button className="kot-btn" onClick={sendKOT} disabled={!selectedOrder || !hasNewItems}>Send KOT</button>
                        <button className="bill-btn" onClick={finalizeBill} disabled={!selectedOrder || selectedOrder.isNew}>Finalize & Bill</button>
                    </div>
                </div>
            </div>
        </div>
    );
}