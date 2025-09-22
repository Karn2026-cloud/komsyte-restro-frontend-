import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api';
import './MenuManagement.css';

// --- Main Menu Management Component ---
export default function MenuManagement() {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    // --- State for the search bar ---
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMenu = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await API.get('/api/menu');
            // Ensure every item has a boolean isAvailable property
            const items = response.data.map(item => ({ ...item, isAvailable: item.isAvailable !== false }));
            setMenuItems(Array.isArray(items) ? items : []);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to fetch menu items.';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    // --- Handler to quickly toggle item availability from the card ---
    const handleToggleAvailability = async (item) => {
        // Optimistically update the UI for a faster user experience
        const updatedMenuItems = menuItems.map(mi =>
            mi._id === item._id ? { ...mi, isAvailable: !mi.isAvailable } : mi
        );
        setMenuItems(updatedMenuItems);
        try {
            // Send the update to the new, dedicated backend route
            await API.put(`/api/menu/toggle-availability/${item._id}`, { isAvailable: !item.isAvailable });
        } catch (err) {
            setError('Failed to update status. Please try again.');
            // If the API call fails, revert the change in the UI by re-fetching
            fetchMenu();
        }
    };

    const handleNewItemClick = () => {
        setEditingItem({ name: '', price: '', category: '', attributes: { description: '' } });
    };

    const handleDeleteClick = async (itemId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this menu item?");
        if (confirmDelete) {
            try {
                await API.delete(`/api/menu/${itemId}`);
                setMenuItems(menuItems.filter(item => item._id !== itemId));
            } catch (err) {
                setError('Failed to delete item.');
                console.error(err);
            }
        }
    };

    // --- Filter and memoize menu items for search performance ---
    const filteredMenuItems = useMemo(() => {
        if (!searchQuery) return menuItems;
        return menuItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [menuItems, searchQuery]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('attributes.')) {
            const attrName = name.split('.')[1];
            setEditingItem(prev => ({
                ...prev,
                attributes: { ...prev.attributes, [attrName]: value }
            }));
        } else {
            setEditingItem(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageChange = (e) => {
        setImageFile(e.target.files[0]);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', editingItem.name);
        formData.append('price', editingItem.price);
        formData.append('category', editingItem.category);
        if (editingItem.attributes.description) {
            formData.append('attributes.description', editingItem.attributes.description);
        }
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            if (editingItem._id) {
                await API.put(`/api/menu/${editingItem._id}`, formData);
            } else {
                await API.post('/api/menu', formData);
            }
            setEditingItem(null);
            setImageFile(null);
            fetchMenu();
        } catch (err) {
            setError('Failed to save item.');
        }
    };

    const handleEditClick = (item) => {
        setEditingItem(item);
    };

    if (isLoading) {
        return <div className="loading-container">Loading Menu...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="menu-management-container">
            <h2 className="section-title">Menu Management</h2>
            <div className="controls-bar">
                <button className="new-item-btn" onClick={handleNewItemClick}>+ Add New Item</button>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* --- Edit/Add Item Form Modal --- */}
            {editingItem && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingItem._id ? 'Edit Item' : 'Add New Item'}</h3>
                        <form onSubmit={handleSaveItem}>
                            <input
                                type="text"
                                name="name"
                                value={editingItem.name}
                                onChange={handleFormChange}
                                placeholder="Item Name"
                                required
                            />
                            <input
                                type="number"
                                name="price"
                                value={editingItem.price}
                                onChange={handleFormChange}
                                placeholder="Price"
                                required
                            />
                            <input
                                type="text"
                                name="category"
                                value={editingItem.category}
                                onChange={handleFormChange}
                                placeholder="Category"
                                required
                            />
                            <textarea
                                name="attributes.description"
                                value={editingItem.attributes?.description || ''}
                                onChange={handleFormChange}
                                placeholder="Description (optional)"
                            />
                            <input
                                type="file"
                                name="image"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                            <div className="form-actions">
                                <button type="submit" className="save-btn">Save</button>
                                <button type="button" className="cancel-btn" onClick={() => setEditingItem(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="menu-grid">
                {filteredMenuItems.map(item => (
                    <div key={item._id} className="menu-card">
                        {/* ✅ FIX: Prepend the backend URL to the image path */}
                        <img src={`http://localhost:5000${item.image}` || 'https://via.placeholder.com/150'} alt={item.name} className="menu-card-img" />
                        <div className="menu-card-body">
                            <h4 className="menu-card-title">{item.name}</h4>
                            <p className="menu-card-price">₹{item.price}</p>
                            <p className="menu-card-desc">{item.attributes?.description}</p>
                            <div className="menu-card-actions">
                                <button onClick={() => handleEditClick(item)} className="edit-btn">Edit</button>
                                <button onClick={() => handleDeleteClick(item._id)} className="delete-btn">Delete</button>
                            </div>
                        </div>
                        {/* --- Availability Toggle on Card --- */}
                        <div className="availability-toggle">
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={item.isAvailable}
                                    onChange={() => handleToggleAvailability(item)}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span>Show to Customer</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}