import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './Tablemanagement.css';
import QRCodeGenerator from './QRCodeGenerator';

// Pass the 'user' prop into this component from restaurant.js
export default function TableManagement({ user }) {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [isMainQrVisible, setIsMainQrVisible] = useState(false);
    const [isTableQrVisible, setIsTableQrVisible] = useState(false);
    const [qrCodeURL, setQrCodeURL] = useState('');
    const [selectedTable, setSelectedTable] = useState(null);

    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);

    const fetchTables = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await API.get('/api/tables');
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
            await API.post('/api/tables', { name: newTableName, capacity: newTableCapacity, isTemporary: false });
            setNewTableName('');
            setNewTableCapacity(4);
            fetchTables();
        } catch (err) {
            setError('Failed to add table.');
        }
    };

    const handleDeleteTable = async (tableId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this table?");
        if (confirmDelete) {
            try {
                await API.delete(`/api/tables/${tableId}`);
                fetchTables();
            } catch (err) {
                setError('Failed to delete table.');
            }
        }
    };

    // --- FIX: Access restaurantId directly from the user object ---
    const handleShowTableQrCode = (table) => {
        if (!user || !user.restaurantId) {
            setError('Restaurant ID not found. Cannot generate QR code.');
            return;
        }
        // URL for a specific table order
        const qrUrl = `${window.location.origin}/customer/menu?shopId=${user.restaurantId}&tableId=${table._id}`;
        setQrCodeURL(qrUrl);
        setSelectedTable(table);
        setIsTableQrVisible(true);
    };

    // --- FIX: Access restaurantId directly from the user object ---
    const handleShowMainQrCode = () => {
        if (!user || !user.restaurantId) {
            setError('Restaurant ID not found. Cannot generate QR code.');
            return;
        }
        // URL for the general restaurant menu
        const qrUrl = `${window.location.origin}/customer/menu?shopId=${user.restaurantId}`;
        setQrCodeURL(qrUrl);
        setIsMainQrVisible(true);
    };

    // --- Function to hide all QR codes ---
    const handleClearQrCode = () => {
        setIsMainQrVisible(false);
        setIsTableQrVisible(false);
        setQrCodeURL('');
        setSelectedTable(null);
    };

    if (isLoading) {
        return <div className="loading-container">Loading Table Management...</div>;
    }

    return (
        <div className="table-management-container">
            <h2 className="section-title">Table & QR Code Management</h2>
            {error && <p className="error-message">{error}</p>}

            {(isMainQrVisible || isTableQrVisible) && (
                <div className="qr-popup-overlay">
                    <div className="qr-popup-content">
                        <h3>QR Code for {isMainQrVisible ? 'Main Menu' : selectedTable?.name}</h3>
                        <p>Scan this code to place an order.</p>
                        <QRCodeGenerator
                            table={selectedTable || { name: 'Restaurant Menu' }}
                            qrCodeURL={qrCodeURL}
                        />
                        {/* --- NEW: Display the clickable link below the QR code --- */}
                        <div className="qr-link-display">
                            <p><strong>QR Code Link:</strong> <a href={qrCodeURL} target="_blank" rel="noopener noreferrer">{qrCodeURL}</a></p>
                        </div>
                        <button className="close-btn" onClick={handleClearQrCode}>Close</button>
                    </div>
                </div>
            )}

            <div className="qr-code-generation-section">
                <h3>Generate Main Menu QR Code</h3>
                <p>This QR code links to your public menu page for all customers.</p>
                <button className="generate-qr-btn" onClick={handleShowMainQrCode}>
                    Generate Main Menu QR Code
                </button>
            </div>

            <div className="table-management-form">
                <h3>Add New Table</h3>
                <form className="add-table-form" onSubmit={handleAddTable}>
                    <input
                        type="text"
                        placeholder="Table Name (e.g., T1, Rooftop 5)"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Capacity"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(e.target.value)}
                        min="1"
                        required
                    />
                    <button type="submit">Add Table</button>
                </form>
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
                            <div className="table-actions">
                                <button className="qr-btn" onClick={() => handleShowTableQrCode(table)}>Generate QR</button>
                                <button className="delete-btn" onClick={() => handleDeleteTable(table._id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}