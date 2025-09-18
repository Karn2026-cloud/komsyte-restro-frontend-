import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './Tablemanagement.css';
import QRCodeGenerator from './QRCodeGenerator';

// Pass the 'user' prop into this component from restaurant.js
export default function TableManagement({ user }) {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- NEW: State to control if the QR code is visible ---
    const [isQrVisible, setIsQrVisible] = useState(false);

    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);

    const fetchTables = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await API.get('/api/tables');
            // Filter out the temporary tables so staff don't see them
            setTables(response.data.filter(t => !t.isTemporary));
        } catch (err) {
            setError('Failed to fetch tables.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleAddTable = async (e) => {
        e.preventDefault();
        if (!newTableName) {
            setError('Table name cannot be empty.');
            return;
        }
        try {
            await API.post('/api/tables', { name: newTableName, capacity: newTableCapacity });
            setNewTableName('');
            setNewTableCapacity(4);
            fetchTables(); // Refresh the list
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add table.');
        }
    };

    const handleDeleteTable = async (tableId) => {
        if (window.confirm('Are you sure you want to delete this table?')) {
            try {
                await API.delete(`/api/tables/${tableId}`);
                fetchTables();
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to delete table.');
            }
        }
    };

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <div className="page-container table-management-page">
            <div className="page-header">
                <h2>QR Code & Table Management</h2>
            </div>

            {/* --- UPDATED: SINGLE SHOP QR CODE SECTION --- */}
            <div className="shop-qr-container">
                <h3>Your Restaurant's QR Code</h3>
                <p>Generate a single QR code for customers to scan and order directly.</p>
                
                {/* --- NEW LOGIC: Show button or QR code based on state --- */}
                {isQrVisible ? (
                    <div className="main-qr-code">
                        {/* Ensure the correct user object structure is passed */}
                        {user && user.restaurantId ? (
                            <>
                                <QRCodeGenerator shop={user.restaurantId} />
                                <button className="delete-btn" style={{marginTop: '15px'}} onClick={() => setIsQrVisible(false)}>
                                    Delete QR Code
                                </button>
                            </>
                        ) : (
                            <p>Could not load shop data to generate QR code.</p>
                        )}
                    </div>
                ) : (
                    <button className="generate-qr-btn" onClick={() => setIsQrVisible(true)}>
                        Generate QR Code
                    </button>
                )}
            </div>

            <div className="add-table-form-container">
                <h3>Add a Manual Table (For Staff Use)</h3>
                <form onSubmit={handleAddTable}>
                    <input
                        type="text"
                        placeholder="Table Name (e.g., T1, Rooftop 5)"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Capacity"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(e.target.value)}
                        min="1"
                    />
                    <button type="submit">Add Table</button>
                </form>
                {error && <p className="error-message">{error}</p>}
            </div>

            <div className="table-list-container">
                <h3>Manually Added Tables ({tables.length})</h3>
                <div className="tables-grid">
                    {tables.map(table => (
                        <div key={table._id} className="table-card">
                            <div className="table-details">
                                <span className="table-name">{table.name}</span>
                                <span className="table-capacity">Capacity: {table.capacity}</span>
                            </div>
                             <button className="delete-btn" onClick={() => handleDeleteTable(table._id)}>Delete</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}