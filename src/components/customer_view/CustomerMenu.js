import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../../api'; // Make sure this path to your API utility is correct
import './Customermenu.css'; // Ensure you have this CSS file

// Helper to get query parameters from URL
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function CustomerMenu() {
    const [menuItems, setMenuItems] = useState([]);
    const [shopName, setShopName] = useState(''); // State to hold the restaurant's name
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState(null);

    const query = useQuery();
    // We now get 'tableId' from the URL
    const tableId = query.get('tableId');
    const shopId = query.get('shopId'); // Retain shopId for public menu fetch

    useEffect(() => {
        if (!tableId && !shopId) {
            setError("Invalid QR Code. Please scan a valid code for the restaurant.");
            setIsLoading(false);
            return;
        }

        const fetchMenuAndShopInfo = async () => {
            try {
                // The public menu endpoint now needs the shopId to know which menu to serve
                const response = await API.get(`/api/public/menu?shopId=${shopId}`);
                
                // Assuming the backend now returns an object with shop info and menu items
                setMenuItems(response.data.menu.filter(item => item.isAvailable));
                setShopName(response.data.shop.shopName);
                setError('');
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Failed to fetch menu items.';
                setError(errorMsg);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenuAndShopInfo();
    }, [tableId, shopId]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cart]);

    const handleAddToCart = useCallback((item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem._id === item._id);
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem._id === item._id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            } else {
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
    }, []);

    const handleQuantityChange = useCallback((itemId, delta) => {
        setCart(prevCart => {
            const updatedCart = prevCart.map(item =>
                item._id === itemId ? { ...item, quantity: item.quantity + delta } : item
            ).filter(item => item.quantity > 0);
            return updatedCart;
        });
    }, []);

    const handleSubmitOrder = async () => {
        if (cart.length === 0) {
            setError('Your cart is empty.');
            return;
        }

        const existingOrderId = localStorage.getItem(`orderId_${shopId}`);

        const orderData = {
            restaurantId: shopId,
            tableId: tableId, // Use tableId from the URL
            items: cart.map(item => ({
                menuItem: item._id,
                quantity: item.quantity,
                price: item.price,
                notes: '' // Placeholder for now
            })),
            totalPrice: cartTotal,
        };

        setIsLoading(true);
        try {
            let response;
            if (existingOrderId) {
                // Update an existing order
                response = await API.put(`/api/public/order/${existingOrderId}`, {
                    ...orderData,
                    action: 'add'
                });
                setOrderSuccess('Order updated successfully!');
            } else {
                // Create a new order
                response = await API.post('/api/public/order', orderData);
                // Store the new order ID in local storage for future updates
                localStorage.setItem(`orderId_${shopId}`, response.data._id);
                setOrderSuccess('Order placed successfully!');
            }
            setCart([]);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'Failed to place order.';
            setError(errorMsg);
            setOrderSuccess(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Filter the menu to show only available items
    const availableMenuItems = useMemo(() => {
        return menuItems.filter(item => item.isAvailable);
    }, [menuItems]);

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="customer-menu-page">
            <header className="customer-menu-header">
                <h2>{shopName || 'Menu'}</h2>
            </header>
            <div className="customer-menu-main">
                <section className="menu-items-section">
                    <h3>Available Items</h3>
                    <div className="menu-grid">
                        {availableMenuItems.length > 0 ? (
                            availableMenuItems.map(item => (
                                <div key={item._id} className="menu-item-card">
                                    <img 
                                        src={item.attributes?.image || 'https://via.placeholder.com/150'} 
                                        alt={item.name} 
                                        className="menu-item-img" 
                                    />
                                    <div className="menu-item-details">
                                        <h4>{item.name}</h4>
                                        <p className="menu-item-price">₹{item.price}</p>
                                        <p className="menu-item-desc">{item.attributes?.description}</p>
                                        <button className="add-to-cart-btn" onClick={() => handleAddToCart(item)}>
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>No menu items available at the moment.</p>
                        )}
                    </div>
                </section>
                <aside className="customer-cart-section">
                    <h3>Your Order</h3>
                    {orderSuccess && <p className="success-message">{orderSuccess}</p>}
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
                                {/* Check local storage using shopId */ }
                                {localStorage.getItem(`orderId_${shopId}`) ? 'Add to Existing Order' : 'Place Order'}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
