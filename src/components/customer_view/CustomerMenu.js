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
    // We now get 'shopId' from the URL, not 'tableId'
    const shopId = query.get('shopId');

    useEffect(() => {
        if (!shopId) {
            setError("Invalid QR Code. Please scan a valid code for the restaurant.");
            setIsLoading(false);
            return;
        }

        const fetchMenuAndShopInfo = async () => {
            try {
                // The public menu endpoint now needs the shopId to know which menu to serve
                const response = await API.get(`/api/public/menu?shopId=${shopId}`);
                
                // Assuming the backend now returns an object with shopName and menuItems
                setMenuItems(Array.isArray(response.data.menuItems) ? response.data.menuItems : []);
                setShopName(response.data.shopName || 'Our Restaurant');
            } catch (err) {
                setError('Could not load the menu. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenuAndShopInfo();

    }, [shopId]); // The effect now depends on shopId

    const addItemToCart = (item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem._id === item._id);
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem._id === item._id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    };

    const handleQuantityChange = (itemId, change) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item._id === itemId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
            ).filter(item => item.quantity > 0)
        );
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setIsLoading(true);
        setError('');

        // Local storage now uses the shopId to track an ongoing order for this restaurant
        const existingOrderId = localStorage.getItem(`orderId_${shopId}`);

        const orderPayload = {
            items: cart.map(item => ({ productId: item._id, quantity: item.quantity, name: item.name, price: item.price })),
            // We send the shopId; the backend will create a temporary table
            shopId: shopId,
            orderType: 'Dine-In-QR', // Using a specific type for these orders
            ...(existingOrderId && { existingOrderId })
        };

        try {
            const { data } = await API.post('/api/public/orders', orderPayload);

            // Save the order ID against the shopId in local storage
            localStorage.setItem(`orderId_${shopId}`, data.orderId);

            setOrderSuccess({ orderId: data.orderId, kotNumber: data.kotNumber });
            setCart([]); // Clear cart after successful order

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place order.');
        } finally {
            setIsLoading(false);
        }
    };

    const groupedMenu = useMemo(() => {
        return menuItems.reduce((acc, item) => {
            const category = item.category || 'Other';
            (acc[category] = acc[category] || []).push(item);
            return acc;
        }, {});
    }, [menuItems]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cart]);


    if (!shopId) {
        return <div className="customer-menu-container error-page"><h1>Error</h1><p>{error}</p></div>;
    }

    if (orderSuccess) {
        return (
            <div className="customer-menu-container success-page">
                <h2>Order Placed Successfully!</h2>
                <p>Your Kitchen Order Ticket (KOT) is #{orderSuccess.kotNumber}.</p>
                <p>Your Order ID is <strong>{orderSuccess.orderId}</strong>.</p>
                <p>You can keep this browser tab open to add more items to your order before paying.</p>
                <button onClick={() => setOrderSuccess(null)}>+ Order More</button>
            </div>
        );
    }

    return (
        <div className="customer-menu-container">
            <header className="menu-header">
                {/* Display the restaurant's name */}
                <h1>Welcome to {shopName}</h1>
                <p>Select your items below and place your order.</p>
            </header>

            {isLoading && <p>Loading menu...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="menu-content">
                <div className="menu-items-section">
                    {Object.entries(groupedMenu).map(([category, items]) => (
                        <section key={category} className="menu-category">
                            <h2>{category}</h2>
                            <div className="items-grid">
                                {items.map(item => (
                                    <div key={item._id} className="menu-item-card">
                                        <img src={item.imageUrl ? `http://localhost:5000${item.imageUrl}` : 'https://via.placeholder.com/150'} alt={item.name} />
                                        <h3>{item.name}</h3>
                                        <div className="card-footer">
                                            <span className="price">₹{item.price}</span>
                                            <button onClick={() => addItemToCart(item)}>Add</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <aside className="cart-sidebar">
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
                                {/* Check local storage using shopId */}
                                {localStorage.getItem(`orderId_${shopId}`) ? 'Add to Existing Order' : 'Place Order'}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}