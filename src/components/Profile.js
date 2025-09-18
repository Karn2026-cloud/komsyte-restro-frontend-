import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './Profile.css';

// --- Sub-component: Add Employee Form ---
const AddEmployeeForm = ({ onEmployeeAdded, setIsLoading }) => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'Waiter', phone: '', payRate: ''
    });
    const [error, setError] = useState('');
    
    const handleChange = e => setFormData({...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true); // ✅ Show loading indicator
        try {
            await API.post('/api/employees', formData);
            // After successful post, call the parent's function to re-fetch all data
            onEmployeeAdded(); 
            // Reset the form for the next entry
            setFormData({ name: '', email: '', password: '', role: 'Waiter', phone: '', payRate: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add employee.');
            setIsLoading(false); // ✅ Stop loading on error
        }
    };

    return (
        <form onSubmit={handleSubmit} className="profile-form">
            <h3>Add New Employee</h3>
            <div className="form-grid">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Employee Name" required />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Employee Email" required />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Temporary Password" required />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" />
                <input type="number" name="payRate" value={formData.payRate} onChange={handleChange} placeholder="Pay Rate (e.g., per hour)" />
                <select name="role" value={formData.role} onChange={handleChange} required>
                    <option value="Waiter">Waiter</option>
                    <option value="Chef">Chef</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                </select>
            </div>
            <button type="submit">Add Employee</button>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
};

// --- Main Profile Component ---
export default function Profile({ user }) {
    const [employees, setEmployees] = useState([]);
    const [performanceMap, setPerformanceMap] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfileData = useCallback(async () => {
        try {
            const [empResponse, perfResponse] = await Promise.all([
                API.get('/api/employees'),
                API.get('/api/reports/dashboard')
            ]);
            
            const fetchedEmployees = Array.isArray(empResponse.data) ? empResponse.data : [];
            setEmployees(fetchedEmployees);
            
            const perfMap = new Map();
            if (perfResponse.data && Array.isArray(perfResponse.data.employeePerformance)) {
                perfResponse.data.employeePerformance.forEach(p => {
                    perfMap.set(p.workerId, p);
                });
            }
            setPerformanceMap(perfMap);

        } catch (err) {
            console.error("Failed to fetch profile data", err);
        } finally {
            // ✅ This will now correctly turn off the loading indicator
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleDeleteEmployee = async (employeeId) => {
        if (window.confirm('Are you sure you want to remove this employee?')) {
            setIsLoading(true);
            try {
                await API.delete(`/api/employees/${employeeId}`);
                fetchProfileData(); // Re-fetch data after deleting
            } catch (err) {
                alert('Failed to remove employee.');
                setIsLoading(false);
            }
        }
    };
    
    if (isLoading) return <div className="loading-container">Loading profiles...</div>;

    return (
        <div className="profile-page-container">
            <h2 className="page-title">Employee Management</h2>
            <AddEmployeeForm onEmployeeAdded={fetchProfileData} setIsLoading={setIsLoading} />
            
            <div className="employee-list-container">
                <h3>Current Staff ({employees.length})</h3>
                <table className="employee-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Total Sales</th>
                            <th>Bills Handled</th>
                            {(user?.role === 'Owner' || user?.role === 'Manager') && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => {
                            const empPerformance = performanceMap.get(emp._id.toString());
                            return (
                                <tr key={emp._id}>
                                    <td>{emp.name}</td>
                                    <td>{emp.email}</td>
                                    <td>{emp.role}</td>
                                    <td>₹{empPerformance?.totalSales?.toFixed(2) || '0.00'}</td>
                                    <td>{empPerformance?.billsCount || 0}</td>
                                    {(user?.role === 'Owner' || user?.role === 'Manager') && (
                                        <td>
                                            {emp.role !== 'Owner' && (
                                                <button className="delete-btn" onClick={() => handleDeleteEmployee(emp._id)}>Remove</button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}