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
            const items = response.data.map(item => ({...item, isAvailable: item.isAvailable !== false}));
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
            // Send the update to the backend. We only need to send the field that's changing.
            await API.put(`/api/menu/${item._id}`, { isAvailable: !item.isAvailable });
        } catch (err) {
            setError('Failed to update status. Please try again.');
            // If the API call fails, revert the change in the UI by re-fetching
            fetchMenu(); 
        }
    };

    const handleNewItemClick = () => {
        setEditingItem({ name: '', price: '', category: '', attributes: { description: '' }, isAvailable: true });
        setImageFile(null);
    };

    const handleEditClick = (item) => {
        setEditingItem({ ...item });
        setImageFile(null);
    };

    const handleDeleteClick = async (itemId) => {
        if (window.confirm('Are you sure you want to delete this menu item?')) {
            try {
                await API.delete(`/api/menu/${itemId}`);
                fetchMenu();
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Failed to delete item.';
                setError(errorMsg);
            }
        }
    };

    const handleCancel = () => {
        setEditingItem(null);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === "description") {
            setEditingItem(prev => ({ ...prev, attributes: { ...prev.attributes, description: value } }));
        } else if (type === 'checkbox') {
            setEditingItem(prev => ({ ...prev, [name]: checked }));
        } else {
            setEditingItem(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFileChange = (e) => {
        setImageFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', editingItem.name);
        formData.append('price', editingItem.price);
        formData.append('category', editingItem.category);
        formData.append('description', editingItem.attributes?.description || '');
        formData.append('isAvailable', editingItem.isAvailable); // Send availability status
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        try {
            const headers = { 'Content-Type': 'multipart/form-data' };
            if (editingItem._id) {
                await API.put(`/api/menu/${editingItem._id}`, formData, { headers });
            } else {
                await API.post('/api/menu', formData, { headers });
            }
            setEditingItem(null);
            setImageFile(null);
            fetchMenu();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to save menu item.';
            setError(errorMsg);
            console.error(err);
        }
    };

    // --- Filter menu items based on search query ---
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, menuItems]);


    if (isLoading) return <div>Loading menu...</div>;

    return (
        <div className="menu-management-container">
            <div className="menu-header">
                <h2>Menu Management</h2>
                <div className="menu-controls">
                    {/* --- Search Bar --- */}
                    <input 
                        type="text"
                        placeholder="Search by name or category..."
                        className="search-bar"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button onClick={handleNewItemClick}>+ Add New Item</button>
                </div>
            </div>
            {error && <p className="error-message">{error}</p>}

            {editingItem && (
                <div className="edit-modal">
                    <form onSubmit={handleSubmit} className="edit-form">
                        <h3>{editingItem._id ? 'Edit' : 'Add'} Menu Item</h3>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" name="name" value={editingItem.name} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                            <label>Price (₹)</label>
                            <input type="number" name="price" value={editingItem.price} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <input type="text" name="category" value={editingItem.category} onChange={handleFormChange} required />
                        </div>
                         <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" value={editingItem.attributes?.description || ''} onChange={handleFormChange}></textarea>
                        </div>
                        <div className="form-group">
                            <label>Image</label>
                            <input type="file" onChange={handleFileChange} />
                        </div>
                        {/* --- Availability Checkbox in Form --- */}
                        <div className="form-group-checkbox">
                             <input 
                                type="checkbox"
                                id="isAvailable"
                                name="isAvailable"
                                checked={editingItem.isAvailable}
                                onChange={handleFormChange}
                             />
                             <label htmlFor="isAvailable">Show this item to customers on the QR Menu</label>
                        </div>
                        <div className="form-actions">
                            <button type="button" onClick={handleCancel}>Cancel</button>
                            <button type="submit">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="menu-items-grid">
                {filteredMenuItems.map(item => (
                    <div key={item._id} className={`menu-card ${!item.isAvailable ? 'item-hidden' : ''}`}>
                        <img src={item.imageUrl ? `http://localhost:5000${item.imageUrl}` : 'https://via.placeholder.com/150'} alt={item.name} className="menu-card-img" />
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