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
            const newTable = {
                name: newTableName,
                capacity: newTableCapacity,
                restaurant: user.restaurantId._id
            };
            await API.post('/api/tables', newTable);
            setNewTableName('');
            setNewTableCapacity(4);
            fetchTables();
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add table.');
        }
    };

    const handleDeleteTable = useCallback(async (tableId) => {
        try {
            await API.delete(`/api/tables/${tableId}`);
            fetchTables();
        } catch (err) {
            setError('Failed to delete table.');
        }
    }, [fetchTables]);

    // --- NEW: Handler for showing/hiding QR code generator and passing the table prop ---
    const handleGenerateQr = (table) => {
        setTables(prevTables => prevTables.map(t =>
            t._id === table._id ? { ...t, showQr: !t.showQr } : t
        ));
    };

    return (
        <div className="table-management-container">
            <header className="page-header">
                <h2>Table Management</h2>
            </header>
            
            <div className="qr-generator-section">
                <h3>QR Code Generation</h3>
                <p>Generate unique QR codes for each table to enable mobile ordering.</p>
                {/* Simplified logic to show one QR code at a time or a selection */}
                {tables.map(table => {
                    // The URL now includes both the shop ID and the specific table ID
                    const qrCodeURL = `https://komsyte-restro-frontend.onrender.com/menu?shopId=${user.restaurantId._id}&tableId=${table._id}`;
                    return (
                        <div key={table._id} className="qr-gen-card">
                            <span>{table.name}</span>
                            <button onClick={() => handleGenerateQr(table)}>
                                {table.showQr ? 'Hide QR Code' : 'Generate QR Code'}
                            </button>
                            {table.showQr && (
                                <>
                                    <QRCodeGenerator table={table} qrCodeURL={qrCodeURL} />
                                    <p style={{ marginTop: '15px' }}>Or share this link:</p>
                                    <a href={qrCodeURL} target="_blank" rel="noopener noreferrer">
                                        {qrCodeURL}
                                    </a>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="add-table-form-container">
                <h3>Add a New Table</h3>
                <form onSubmit={handleAddTable} className="add-table-form">
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
