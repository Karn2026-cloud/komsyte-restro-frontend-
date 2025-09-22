import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../../api'; // Make sure this path to your API utility is correct
import './Customermenu.css'; // Ensure you have this CSS file

// Helper to get query parameters from URL
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function CustomerMenu() {
    const [menuItems, setMenuItems] = useState([]);
    const [shopName, setShopName] = useState('');
    const [logo, setLogo] = useState('');
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState(null);
    
    // --- NEW: State for live order status and details ---
    const [orderStatus, setOrderStatus] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [liveOrder, setLiveOrder] = useState(null);

    // --- NEW: State for customer information and order type ---
    const [orderType, setOrderType] = useState('Dine-In');
    const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '', tableId: '' });

    const query = useQuery();
    const shopId = query.get('shopId');
    const tableId = query.get('tableId');

    const fetchMenuAndShopInfo = useCallback(async () => {
        if (!shopId) {
            setError('Invalid menu link. Shop ID is missing.');
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const response = await API.get(`/api/public/menu?shopId=${shopId}`);
            setMenuItems(response.data.menu || []);
            setShopName(response.data.restaurant.shopName);
            setLogo(response.data.restaurant.logo);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to load menu. Please check the link and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        fetchMenuAndShopInfo();
    }, [fetchMenuAndShopInfo]);

    const handleAddToCart = useCallback((item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(i => i._id === item._id);
            if (existingItem) {
                return prevCart.map(i =>
                    i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    }, []);

    const handleQuantityChange = useCallback((itemId, amount) => {
        setCart(prevCart => {
            const updatedCart = prevCart.map(item =>
                item._id === itemId ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item
            ).filter(item => item.quantity > 0);
            return updatedCart;
        });
    }, []);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cart]);

    const handleSubmitOrder = async () => {
        if (cart.length === 0) {
            setError('Your cart is empty. Please add items to place an order.');
            return;
        }

        setIsLoading(true);
        setError('');

        const orderItems = cart.map(item => ({
            menuItemId: item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        }));

        const payload = {
            tableId: tableId,
            items: orderItems,
            totalAmount: cartTotal,
            orderType: tableId ? 'Dine-In-QR' : 'Dine-In',
        };

        try {
            const response = await API.post('/api/public/order', payload);
            setOrderSuccess(response.data);
            setCart([]); // Clear cart after successful order
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to place order.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="loading-container">Loading Menu...</div>;
    }

    if (error) {
        return <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
        </div>;
    }

    if (orderSuccess) {
        return <div className="success-container">
            <h2>Order Placed!</h2>
            <p>Your order number is: <strong>{orderSuccess.orderId}</strong></p>
            <p>Your order has been sent to the kitchen. You can now close this page.</p>
            <button onClick={() => setOrderSuccess(null)} className="return-btn">Place another order</button>
        </div>;
    }

    return (
        <div className="customer-menu-container">
            <header className="menu-header">
                {logo && <img src={logo} alt="Restaurant Logo" className="menu-logo" />}
                <h1 className="menu-title">{shopName}</h1>
                <p className="menu-subtitle">
                    {tableId ? `Menu for Table: ${tableId}` : 'Browse our delicious menu!'}
                </p>
            </header>

            <div className="menu-content">
                <section className="menu-items-section">
                    <h2 className="section-heading">Our Menu</h2>
                    <div className="menu-grid">
                        {menuItems.length > 0 ? (
                            menuItems.map(item => (
                                <div key={item._id} className="menu-item-card" onClick={() => handleAddToCart(item)}>
                                    <div className="item-image-wrapper">
                                        <img
                                            src={item.image || 'https://via.placeholder.com/150'}
                                            alt={item.name}
                                            className="item-image"
                                        />
                                    </div>
                                    <div className="item-info">
                                        <h4 className="item-name">{item.name}</h4>
                                        <p className="item-price">₹{item.price.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-items-message">No menu items available at this time.</p>
                        )}
                    </div>
                </section>

                <aside className="order-summary-section">
                    <h2 className="section-heading">Your Order</h2>
                    {cart.length === 0 ? (
                        <p className="empty-cart-message">Your cart is empty.</p>
                    ) : (
                        <>
                            <ul className="cart-items">
                                {cart.map(item => (
                                    <li key={item._id} className="cart-item">
                                        <span className="cart-item-name">{item.name}</span>
                                        <div className="cart-qty-controls">
                                            <button onClick={() => handleQuantityChange(item._id, -1)}>-</button>
                                            <span className="cart-qty-value">{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item._id, 1)}>+</button>
                                        </div>
                                        <span className="cart-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="cart-total">
                                <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
                            </div>
                            <button
                                className="place-order-btn"
                                onClick={handleSubmitOrder}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Placing Order...' : 'Place Order'}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}