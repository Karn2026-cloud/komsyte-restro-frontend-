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

// --- Import CSS and Assets ---
import './Restaurant.css';
import komsyteLogo from '../assets/komsyte-logo.jpg';
import { FaBars, FaTimes } from 'react-icons/fa';

// ===================================================================
//                  Point of Sale (POS) Component
// ===================================================================
const AdvancedRestaurantPOS = ({ user }) => {
    const [tables, setTables] = React.useState([]);
    const [menuItems, setMenuItems] = React.useState([]);
    const [activeOrders, setActiveOrders] = React.useState([]);
    const [selectedOrder, setSelectedOrder] = React.useState(null);
    const [currentOrderItems, setCurrentOrderItems] = React.useState([]);
    const [orderType, setOrderType] = React.useState('Dine-In');
    const [customerDetails, setCustomerDetails] = React.useState({ name: '', phone: '', address: '' });
    const [loading, setLoading] = React.useState(true);
    const [message, setMessage] = React.useState('');
    const [activePanel, setActivePanel] = React.useState(null);

    const fetchData = React.useCallback(async () => {
        try {
            const [tablesRes, menuRes, activeOrdersRes] = await Promise.all([
                API.get('/api/tables'),
                API.get('/api/menu'),
                API.get('/api/orders/active')
            ]);

            setTables(Array.isArray(tablesRes.data) ? tablesRes.data : []);
            setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
            setActiveOrders(Array.isArray(activeOrdersRes.data) ? activeOrdersRes.data : []);
        } catch (err) {
            setMessage('Error fetching restaurant data.');
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        setLoading(true);
        fetchData();
        const interval = setInterval(fetchData, 20000); // Refresh data every 20 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        setCurrentOrderItems(order.items);
        setOrderType(order.orderType);
        setActivePanel(null); // Close modal on selection
    };
    
    const handleSelectTable = (table) => {
        const existingOrder = activeOrders.find(o => o.tableId?._id === table._id);
        if (existingOrder) {
            handleSelectOrder(existingOrder);
        } else {
            setSelectedOrder({ tableId: table, isNew: true });
            setCurrentOrderItems([]);
            setOrderType('Dine-In');
            setActivePanel(null); // Close modal on selection
        }
    };
    
    const handleNewDeliveryOrder = () => {
        setSelectedOrder({ orderType: 'Delivery', isNew: true });
        setCurrentOrderItems([]);
        setOrderType('Delivery');
        setCustomerDetails({ name: '', phone: '', address: '' });
        setActivePanel(null); // Close modal on selection
    };

    const addItemToOrder = (menuItem) => {
        if (!selectedOrder) {
            setMessage("Please select a table or start an order first!");
            return;
        }
        setCurrentOrderItems(prevItems => {
            const existingNewItem = prevItems.find(item => item.productId === menuItem._id && item.status === 'New');
            if (existingNewItem) {
                return prevItems.map(item =>
                    item.productId === menuItem._id && item.status === 'New'
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prevItems, { ...menuItem, productId: menuItem._id, quantity: 1, status: 'New' }];
            }
        });
    };
    
    const handleQuantityChange = (itemId, change) => {
        setCurrentOrderItems(prevItems => 
            prevItems.map(item => {
                if (item.productId === itemId && item.status === 'New') {
                    const newQuantity = item.quantity + change;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
                }
                return item;
            }).filter(Boolean)
        );
    };
    
    const sendKOT = async () => {
        if (!selectedOrder || currentOrderItems.filter(i => i.status === 'New').length === 0) {
            setMessage("No new items to send to kitchen.");
            return;
        }

        const itemsForKOT = currentOrderItems.map(item => 
            item.status === 'New' ? { ...item, status: 'Sent to Kitchen' } : item
        );

        try {
            if (selectedOrder.isNew) {
                const payload = {
                    items: itemsForKOT,
                    orderType: orderType,
                    ...(orderType === 'Dine-In' && { tableId: selectedOrder.tableId._id }),
                    ...(orderType !== 'Dine-In' && { customerDetails })
                };
                await API.post('/api/orders', payload);
                setMessage('New order created and KOT sent!');
            } else {
                await API.put(`/api/orders/${selectedOrder._id}/items`, { items: itemsForKOT });
                setMessage('KOT sent for additional items!');
            }
            
            fetchData();
            setSelectedOrder(null);
            setCurrentOrderItems([]);

        } catch (err) {
            setMessage(err.response?.data?.error || 'Failed to send KOT.');
            console.error(err);
        }
    };

    const generateBill = async () => {
        if (!selectedOrder || selectedOrder.isNew) {
            setMessage("No active order selected to bill.");
            return;
        }
        try {
            const { data: newBill } = await API.post('/api/bills', { orderId: selectedOrder._id });
            generatePdfReceipt(newBill, selectedOrder);
            setMessage(`Bill ${newBill.billNumber} generated successfully.`);
            fetchData();
            setSelectedOrder(null);
            setCurrentOrderItems([]);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Failed to generate bill.');
            console.error(err);
        }
    };

    const generatePdfReceipt = (bill, order) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(user?.restaurantId?.shopName || "Restaurant", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        const identifier = order.tableId?.name || order.customerDetails?.name || 'Takeaway';
        doc.text(`Bill For: ${identifier}`, 14, 30);
        doc.text(`Date: ${new Date().toLocaleString('en-IN')}`, 14, 35);
        autoTable(doc, {
            startY: 45,
            head: [['Item', 'Qty', 'Price', 'Total']],
            body: order.items.map(item => [item.name, item.quantity, `₹${item.price.toFixed(2)}`, `₹${(item.price * item.quantity).toFixed(2)}`]),
            theme: 'grid',
        });
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(14);
        doc.text(`Grand Total: ₹${bill.totalAmount.toFixed(2)}`, 14, finalY + 15);
        doc.save(`Bill-${identifier}-${bill.billNumber}.pdf`);
    };

    if (loading) return <div>Loading Restaurant...</div>;
    
    const activeDineInOrders = activeOrders.filter(o => ['Dine-In', 'Dine-In-QR'].includes(o.orderType));
    const activeOtherOrders = activeOrders.filter(o => !['Dine-In', 'Dine-In-QR'].includes(o.orderType));

    return (
        <div className="restaurant-pos-container-modal-based">
             {activePanel && (
                <div className="pos-modal-overlay" onClick={() => setActivePanel(null)}>
                    <div className="pos-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setActivePanel(null)}><FaTimes /></button>
                        {activePanel === 'tables' && (
                            <div className="tables-panel in-modal">
                                <h3>Dine-In Tables</h3>
                                <div className="table-grid">
                                    {tables.filter(t => !t.isTemporary).map(table => {
                                        const order = activeDineInOrders.find(o => o.tableId?._id === table._id);
                                        const status = order ? 'occupied' : 'available';
                                        return <div key={table._id} className={`table-box ${status}`} onClick={() => handleSelectTable(table)}>{table.name}</div>;
                                    })}
                                </div>
                                <hr />
                                <h3>Other Active Orders</h3>
                                <div className="delivery-section">
                                    <button onClick={handleNewDeliveryOrder}>+ New Delivery / Takeaway</button>
                                    <div className="delivery-grid">
                                    {activeDineInOrders.filter(o => o.tableId?.isTemporary).map(order => (
                                        <div key={order._id} className="delivery-box occupied" onClick={() => handleSelectOrder(order)}>
                                            {order.tableId.name} (QR)
                                        </div>
                                    ))}
                                    {activeOtherOrders.map(order => (
                                        <div key={order._id} className="delivery-box occupied" onClick={() => handleSelectOrder(order)}>
                                            {order.customerDetails?.name || order.orderType}
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activePanel === 'menu' && (
                             <div className="menu-panel in-modal">
                                <h3>Menu</h3>
                                {/* --- ✅ UPDATED SECTION: Menu items now show selection state and quantity --- */}
                                <div className="menu-grid">
                                    {menuItems.map(item => {
                                        const selectedItemInOrder = currentOrderItems.find(orderItem => orderItem.productId === item._id);
                                        const isSelected = !!selectedItemInOrder;

                                        return (
                                            <div 
                                                key={item._id} 
                                                className={`menu-item-box ${isSelected ? 'selected' : ''}`} 
                                                onClick={() => addItemToOrder(item)}
                                            >
                                                {isSelected && (
                                                    <div className="item-quantity-badge">
                                                        {selectedItemInOrder.quantity}
                                                    </div>
                                                )}
                                                <img src={item.imageUrl ? `http://localhost:5000${item.imageUrl}` : 'https://via.placeholder.com/100'} alt={item.name} className="menu-item-img-small" />
                                                <div className="menu-item-info">
                                                    <div className="menu-item-name">{item.name}</div>
                                                    <div className="menu-item-price">₹{item.price.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="order-panel-main">
                <div className="order-panel-header">
                    <h3>{selectedOrder ? `Order: ${selectedOrder?.tableId?.name || selectedOrder?.customerDetails?.name || 'New Delivery/Takeaway'}` : 'No Order Selected'}</h3>
                    <div className="pos-main-actions">
                        <button onClick={() => setActivePanel('tables')}>Select Table / Order</button>
                        <button onClick={() => setActivePanel('menu')} disabled={!selectedOrder}>Add Items</button>
                    </div>
                </div>
                {orderType !== 'Dine-In' && orderType !== 'Dine-In-QR' && selectedOrder?.isNew && (
                    <div className="customer-details-form">
                         <input type="text" placeholder="Customer Name" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} required />
                         <input type="text" placeholder="Phone Number" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} required />
                         {orderType === 'Delivery' && <input type="text" placeholder="Address" value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} />}
                    </div>
                )}
                <div className="order-items-list">
                    {currentOrderItems.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th className="qty-col">Qty</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentOrderItems.map((item, index) => (
                                    <tr key={item.productId + index}>
                                        <td>{item.name}</td>
                                        <td className="qty-col">
                                            {item.status === 'New' ? (
                                                <div className="qty-adjust">
                                                    <button onClick={() => handleQuantityChange(item.productId, -1)}>-</button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => handleQuantityChange(item.productId, 1)}>+</button>
                                                </div>
                                            ) : (
                                                <span>{item.quantity}</span>
                                            )}
                                        </td>
                                        <td><span className={`status-${item.status?.toLowerCase().replace(' ', '-')}`}>{item.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="empty-order-text">Select a table to start an order, or choose an existing order.</p>}
                </div>
                <div className="order-actions">
                    <button className="kot-btn" onClick={sendKOT} disabled={!selectedOrder || currentOrderItems.filter(i => i.status === 'New').length === 0}>Send to Kitchen (KOT)</button>
                    <button className="bill-btn" onClick={generateBill} disabled={!selectedOrder || selectedOrder.isNew}>Generate Bill</button>
                </div>
                {message && <p className="pos-message">{message}</p>}
            </div>
        </div>
    );
};


// ===================================================================
//                 Main Layout Component (Wrapper)
// ===================================================================
export default function RestaurantLayout() {
    const [isSidebarOpen, setSidebarOpen] = React.useState(false);
    const [fullUserData, setFullUserData] = React.useState(null); 
    const [error, setError] = React.useState('');
    const [isLoadingUser, setIsLoadingUser] = React.useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = React.useCallback(() => {
        localStorage.removeItem('token');
        navigate('/login');
    }, [navigate]);

    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await API.get('/api/profile');
                setFullUserData(data);
            } catch (err) {
                console.error("Could not fetch user data:", err);
                setError('Could not verify user session. Please log in again.');
                handleLogout();
            } finally {
                setIsLoadingUser(false);
            }
        };
        fetchUser();
    }, [handleLogout]);

    const RESTAURANT_MENU_ITEMS = {
        pos: 'POS Terminal',
        menu: 'Menu Management',
        tables: 'Table Management',
        reports: 'Reports & Analytics',
        kds: 'Kitchen Display',
        profile: 'Profile',
    };

    const getActiveMenuKey = () => {
        const path = location.pathname.split('/restaurant/')[1] || 'pos';
        return RESTAURANT_MENU_ITEMS[path] ? path : 'pos';
    };
    
    if (isLoadingUser) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading User...</div>
    }

    if (error && !fullUserData) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h2>Authentication Error</h2>
                <p>{error}</p>
                <button onClick={handleLogout}>Go to Login</button>
            </div>
        );
    }

    return (
        <div className="home-container">
            <nav className={`sidebar ${isSidebarOpen ? 'show' : ''}`}>
                <div className="sidebar-logo"><img src={komsyteLogo} alt="KOMSYTE Logo" /></div>
                <ul className="menu-list">
                    {Object.entries(RESTAURANT_MENU_ITEMS).map(([key, value]) => (
                        <li key={key} className="menu-item">
                            <Link to={`/restaurant/${key}`} className={`menu-button ${getActiveMenuKey() === key ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                {value}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="main-content-wrapper">
                <header className="main-header">
                    <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <h2 className="header-title">{RESTAURANT_MENU_ITEMS[getActiveMenuKey()]}</h2>
                    <div className="header-user-info">
                        <span>Welcome, <strong>{fullUserData?.user?.restaurantId?.shopName || 'Owner'}</strong></span>
                        <button className="logout-button-header" onClick={handleLogout}>Logout</button>
                    </div>
                </header>
                <main className="main-content">
                    <Routes>
                        <Route path="pos" element={<AdvancedRestaurantPOS user={fullUserData?.user} />} />
                        <Route path="menu" element={<MenuManagement user={fullUserData?.user} />} />
                        <Route path="kds" element={<KDS user={fullUserData?.user} />} />
                        <Route path="tables" element={<TableManagement user={fullUserData?.user} />} />
                        <Route path="reports" element={<Reports user={fullUserData?.user} />} />
                        <Route path="profile" element={<Profile user={fullUserData?.user} />} /> 
                        <Route index element={<Navigate to="pos" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}