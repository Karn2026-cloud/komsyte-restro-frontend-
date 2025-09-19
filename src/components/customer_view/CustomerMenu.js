// src/components/customer_view/CustomerMenu.js
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../../api';
import './Customermenu.css';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function CustomerMenu() {
    const [menuItems, setMenuItems] = useState([]);
    const [shopName, setShopName] = useState('');
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState(null);

    const query = useQuery();
    const shopId = query.get('shopId');
    const tableId = query.get('tableId'); // Get the tableId from the URL

    useEffect(() => {
        if (!shopId || !tableId) {
            setError("Invalid QR Code. Please scan a valid code for the restaurant.");
            setIsLoading(false);
            return;
        }

        const fetchMenuAndShopInfo = async () => {
            try {
                // Fetch the public menu using the shopId
                const response = await API.get(`/api/public/menu?shopId=${shopId}`);
                
                setMenuItems(response.data.menuItems);
                setShopName(response.data.shopName);
                setError('');
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Failed to fetch menu. The restaurant might be unavailable.';
                setError(errorMsg);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenuAndShopInfo();
    }, [shopId, tableId]); // Dependency array to re-run on changes to shopId or tableId

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [cart]);

    const handleAddToCart = (item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(i => i._id === item._id);
            if (existingItem) {
                return prevCart.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    };

    const handleQuantityChange = (id, delta) => {
        setCart(prevCart => {
            const newCart = prevCart.map(item =>
                item._id === id ? { ...item, quantity: item.quantity + delta } : item
            ).filter(item => item.quantity > 0);
            return newCart;
        });
    };

    const handleSubmitOrder = async () => {
        setIsLoading(true);
        setError('');
        setOrderSuccess(null);

        const orderData = {
            restaurantId: shopId,
            tableId: tableId, // Pass the tableId to the backend
            items: cart.map(item => ({
                menuItemId: item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalPrice: cartTotal,
        };

        try {
            const response = await API.post('/api/public/order', orderData);
            setOrderSuccess('Order placed successfully! Your order number is: ' + response.data.kotNumber);
            setCart([]);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place order.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="loading-state">Loading menu...</div>;
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    return (
        <div className="customer-menu-container">
            <header className="menu-header">
                <h1>{shopName || 'Restaurant Menu'}</h1>
                <p>Scan a new QR code to start a new order.</p>
            </header>
            <div className="content-wrapper">
                <main className="menu-items">
                    <h2>Menu</h2>
                    <div className="menu-grid">
                        {menuItems.map(item => (
                            <div key={item._id} className="menu-card">
                                <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.name} className="menu-card-img" />
                                <div className="menu-card-body">
                                    <h4 className="menu-card-title">{item.name}</h4>
                                    <p className="menu-card-price">₹{item.price}</p>
                                    <button className="add-to-cart-btn" onClick={() => handleAddToCart(item)}>Add to Cart</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
                <aside className="cart-summary">
                    <h2>Your Order</h2>
                    {cart.length === 0 ? (
                        <p>Your cart is empty.</p>
                    ) : (
                        <>
                            <ul className="cart-items">
                                {cart.map(item => (
                                    <li key={item._id}>
                                        <span>{item.name}</span>
                                        <div className="cart-qty">
                                            <button onClick={() => handleQuantityChange(item._id, -1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item._id, 1)}>+</button>
                                        </div>
                                        <span className="cart-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="cart-total">
                                <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
                            </div>
                            <button className="place-order-btn" onClick={handleSubmitOrder} disabled={isLoading}>
                                Place Order
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
