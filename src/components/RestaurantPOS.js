import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api';
import './RestaurantPOS.css';

export default function RestaurantPOS() {
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [menuSearchQuery, setMenuSearchQuery] = useState('');
    
    // State for Manual Item Entry
    const [manualItem, setManualItem] = useState({ name: '', price: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tablesRes, menuRes, activeOrdersRes] = await Promise.all([
                API.get('/api/tables'),
                API.get('/api/menu'),
                API.get('/api/order/active')
            ]);
            setTables(tablesRes.data);
            setMenuItems(menuRes.data);

            const qrOrdersRes = await API.get('/api/orders/qr-code');
            const allOrders = [...activeOrdersRes.data, ...qrOrdersRes.data];
            setActiveOrders(allOrders);

        } catch (err) {
            console.error('Failed to fetch data:', err); // Log the full error
            setMessage('Error: Could not connect to the server or fetch data.');
        } finally {
            setLoading(false);
        }
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

    const handleSelectQrOrder = (order) => {
        setSelectedOrder(order);
    };

    const handleNewTakeaway = () => {
        setSelectedOrder({ orderType: 'Takeaway', items: [], isNew: true, customerDetails: { name: `Guest ${Date.now() % 1000}` } });
    };

    const handleNewDeliveryOrder = () => {
        setSelectedOrder({ orderType: 'Delivery', items: [], isNew: true, customerDetails: { name: '', phone: '', address: '' } });
    };

    const addItemToOrder = (menuItem) => {
        if (!selectedOrder) {
            setMessage("Please select a table or create a new order first!");
            return;
        }

        setSelectedOrder(prev => {
            const existingItemIndex = prev.items.findIndex(item => item.menuItemId === menuItem._id && item.status === 'New');

            if (existingItemIndex > -1) {
                const newItems = [...prev.items];
                newItems[existingItemIndex] = {
                    ...newItems[existingItemIndex],
                    quantity: newItems[existingItemIndex].quantity + 1
                };
                return { ...prev, items: newItems };
            } else {
                const itemToAdd = {
                    ...menuItem,
                    menuItemId: menuItem._id,
                    quantity: 1,
                    status: 'New'
                };
                return {
                    ...prev,
                    items: [...prev.items, itemToAdd]
                };
            }
        });
        setMessage(`${menuItem.name} added to order!`);
    };

    const handleAddManualItem = () => {
        if (!selectedOrder) {
            setMessage("Please select an order or table first!");
            return;
        }
        if (!manualItem.name || !manualItem.price) {
            setMessage("Please enter a name and price for the manual item.");
            return;
        }

        const newPrice = parseFloat(manualItem.price);
        if (isNaN(newPrice) || newPrice <= 0) {
            setMessage("Please enter a valid positive price for the manual item.");
            return;
        }

        setSelectedOrder(prev => {
            const existingManualItemIndex = prev.items.findIndex(
                item => item.name === manualItem.name && item.menuItemId?.startsWith('manual-')
            );

            if (existingManualItemIndex > -1) {
                const newItems = [...prev.items];
                newItems[existingManualItemIndex] = {
                    ...newItems[existingManualItemIndex],
                    quantity: newItems[existingManualItemIndex].quantity + 1,
                    price: newPrice 
                };
                setMessage(`${manualItem.name} quantity increased to ${newItems[existingManualItemIndex].quantity}.`);
                return { ...prev, items: newItems };
            } else {
                const newItem = {
                    menuItemId: `manual-${Date.now()}`,
                    name: manualItem.name,
                    price: newPrice,
                    quantity: 1,
                    status: 'New',
                };
                setMessage(`${newItem.name} added manually.`);
                return {
                    ...prev,
                    items: [...prev.items, newItem]
                };
            }
        });
        setManualItem({ name: '', price: '' });
    };

    const handleQuantityChange = (menuItemId, change) => {
        setSelectedOrder(prev => {
            const item = prev.items.find(i => i.menuItemId === menuItemId);
            if (!item) return prev;

            const newQuantity = item.quantity + change;

            if (item.status !== 'New' && item.status !== 'Placed') {
                setMessage("Cannot change quantity of an item that has already been sent to the kitchen.");
                return prev;
            }

            if (newQuantity <= 0) {
                return {
                    ...prev,
                    items: prev.items.filter(i => i.menuItemId !== menuItemId)
                };
            }

            return {
                ...prev,
                items: prev.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity: newQuantity } : i)
            };
        });
    };

    const handleRemoveItem = (menuItemId) => {
        setSelectedOrder(prev => {
            const item = prev.items.find(i => i.menuItemId === menuItemId);
            if (!item) return prev;

            if (item.status !== 'New' && item.status !== 'Placed') {
                setMessage("Cannot remove an item that has already been sent to the kitchen.");
                return prev;
            }

            return {
                ...prev,
                items: prev.items.filter(i => i.menuItemId !== menuItemId)
            };
        });
    };

    const sendKOT = async () => {
        const newItems = selectedOrder.items.filter(item => item.status === 'New');

        if (!selectedOrder || newItems.length === 0) {
            setMessage("No new items to send to the kitchen.");
            return;
        }

        try {
            // Filter out manual items that have a string ID for the server payload
            const itemsForServer = newItems.filter(item => !item.menuItemId.startsWith('manual-'))
            
            const payload = {
                orderType: selectedOrder.orderType,
                tableId: selectedOrder.tableId?._id,
                items: itemsForServer.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    status: 'Sent to Kitchen',
                    name: item.name,
                    price: item.price
                }))
            };

            const res = selectedOrder.isNew
                ? await API.post('/api/public/order', {
                    ...payload,
                    totalAmount: selectedOrder.totalAmount
                  })
                : await API.post(`/api/orders/add-items/${selectedOrder._id}`, { items: payload.items });

            setSelectedOrder(prev => {
                const updatedItems = prev.items.map(item =>
                    item.status === 'New' ? { ...item, status: 'Placed' } : item
                );
                return {
                    ...prev,
                    _id: res.data.orderId || prev._id,
                    isNew: false,
                    items: updatedItems,
                };
            });

            setMessage('KOT sent successfully!');
            fetchData();
        } catch (err) {
            console.error('Failed to send KOT:', err);
            setMessage('Failed to send KOT. Please try again. Check server logs for details.');
        }
    };

    const finalizeBill = async () => {
        if (!selectedOrder || selectedOrder.isNew) {
            setMessage("Please select an existing order to finalize the bill.");
            return;
        }

        try {
            // ✅ CORRECTED: Pass paymentMethod in the request body
            await API.post(`/api/orders/finalize/${selectedOrder._id}`, { paymentMethod: 'Cash' });
            setMessage('Bill finalized successfully!');
            fetchData();
            setSelectedOrder(null);
        } catch (err) {
            setMessage('Failed to finalize bill.');
            console.error(err);
        }
    };

    const calculateTotal = () => {
        return (selectedOrder?.items || []).reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const filteredMenuItems = useMemo(() => {
        if (!menuSearchQuery) {
            return menuItems.filter(item => item.isAvailable);
        }
        const query = menuSearchQuery.toLowerCase();
        return menuItems.filter(item =>
            item.isAvailable && (item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query))
        );
    }, [menuItems, menuSearchQuery]);

    if (loading) return <div className="loading-container">Loading POS System...</div>;

    const qrOrders = activeOrders.filter(o => ['Dine-In-QR', 'Takeaway', 'Delivery'].includes(o.orderType));

    return (
        <div className="pos-layout">
            <div className="pos-sidebar">
                <h2>Tables</h2>
                <div className="table-list">
                    {tables.map(table => (
                        <div key={table._id} className={`table-card ${selectedOrder?.tableId?._id === table._id ? 'active' : ''}`} onClick={() => handleSelectTable(table)}>
                            <p>{table.name}</p>
                            <span>Capacity: {table.capacity}</span>
                        </div>
                    ))}
                </div>

                <h2>Online Orders</h2>
                <div className="order-list">
                    {qrOrders.length > 0 ? (
                        qrOrders.map(order => (
                            <div key={order._id} className={`order-card ${selectedOrder?._id === order._id ? 'active' : ''}`} onClick={() => handleSelectQrOrder(order)}>
                                <h4>{order.orderType} Order #{order.orderNumber}</h4>
                                <p>Status: {order.status}</p>
                                <p>Items: {order.items.length}</p>
                            </div>
                        ))
                    ) : <p className="no-orders-message">No online orders</p>}
                </div>

                <div className="pos-actions">
                    <button className="new-order-btn" onClick={handleNewTakeaway}>New Takeaway Order</button>
                    <button className="new-order-btn" onClick={handleNewDeliveryOrder}>New Delivery Order</button>
                </div>
            </div>

            <div className="pos-main">
                <div className="order-details-panel">
                    <h3>Order Details</h3>
                    {message && <p className="pos-message">{message}</p>}
                    {selectedOrder ? (
                        <>
                            <div className="order-header">
                                <p>Order ID: {selectedOrder._id || 'New Order'}</p>
                                <p>Order Type: {selectedOrder.orderType}</p>
                            </div>
                            <table className="order-items-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Price</th>
                                        <th>Qty</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map(item => (
                                        <tr key={item.menuItemId}>
                                            <td>{item.name}</td>
                                            <td>₹{item.price.toFixed(2)}</td>
                                            <td>
                                                {item.status === 'New' || item.status === 'Placed' ? (
                                                    <div className="qty-controls">
                                                        <button className="qty-btn" onClick={() => handleQuantityChange(item.menuItemId, -1)}>-</button>
                                                        <span>{item.quantity}</span>
                                                        <button className="qty-btn" onClick={() => handleQuantityChange(item.menuItemId, 1)}>+</button>
                                                    </div>
                                                ) : <span>{item.quantity}</span>}
                                            </td>
                                            <td><span className={`order-item-status status-${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span></td>
                                            <td>
                                                {/* Only show remove button for items that haven't been sent to the kitchen */}
                                                {(item.status === 'New' || item.status === 'Placed') && (
                                                    <button onClick={() => handleRemoveItem(item.menuItemId)} className="remove-item-btn">Remove</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="order-footer">
                                <div className="order-total">
                                    <span>Total</span>
                                    <span>₹{calculateTotal().toFixed(2)}</span>
                                </div>
                                <div className="order-actions">
                                    <button className="kot-btn" onClick={sendKOT}>Accept & Send KOT</button>
                                    <button className="bill-btn" onClick={finalizeBill} disabled={selectedOrder.isNew}>Finalize & Bill</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p>Please select an order or table to begin.</p>
                    )}
                </div>
            </div>

            <div className="pos-menu-panel">
                <h3>Menu</h3>
                <input
                    type="text"
                    placeholder="Search menu items..."
                    className="menu-search-input"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                />
                
                {/* Manual Item Entry Form */}
                <div className="manual-item-form">
                    <input
                        type="text"
                        placeholder="Manual Item Name"
                        value={manualItem.name}
                        onChange={(e) => setManualItem({...manualItem, name: e.target.value})}
                    />
                    <input
                        type="number"
                        placeholder="Price"
                        value={manualItem.price}
                        onChange={(e) => setManualItem({...manualItem, price: e.target.value})}
                        step="0.01"
                        min="0"
                    />
                    <button onClick={handleAddManualItem}>Add Manual Item</button>
                </div>
                
                <div className="menu-list">
                    {filteredMenuItems.length > 0 ? (
                        filteredMenuItems.map(item => (
                            <div key={item._id} className="menu-item-card" onClick={() => addItemToOrder(item)}>
                                <h4 className="menu-item-name">{item.name}</h4>
                                <p className="menu-item-price">₹{item.price.toFixed(2)}</p>
                            </div>
                        ))
                    ) : (
                        <p className="no-items-message">No items found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}