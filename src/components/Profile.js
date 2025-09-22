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
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" />
                <select name="role" value={formData.role} onChange={handleChange} required>
                    <option value="Waiter">Waiter</option>
                    <option value="Manager">Manager</option>
                    <option value="Owner">Owner</option>
                </select>
                <input type="number" name="payRate" value={formData.payRate} onChange={handleChange} placeholder="Pay Rate" />
            </div>
            <button type="submit" className="submit-btn">Add Employee</button>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
};

// --- Main Profile Component ---
export default function Profile({ user }) {
    const [employees, setEmployees] = useState([]);
    const [performanceMap, setPerformanceMap] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const fetchEmployeesAndPerformance = useCallback(async () => {
        setIsLoading(true);
        try {
            const [profileRes, employeesRes, dashboardRes] = await Promise.all([
                API.get('/api/profile'),
                API.get('/api/employees'),
                API.get('/api/reports/dashboard')
            ]);
            
            setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
            
            const employeePerformanceData = dashboardRes.data.employeePerformance;
            const newPerformanceMap = new Map();
            if (Array.isArray(employeePerformanceData)) {
                employeePerformanceData.forEach(perf => {
                    newPerformanceMap.set(perf.workerId.toString(), perf);
                });
            }
            setPerformanceMap(newPerformanceMap);
            setError('');
        } catch (err) {
            setError('Failed to load employee data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployeesAndPerformance();
    }, [fetchEmployeesAndPerformance]);

    const handleDeleteEmployee = async (employeeId) => {
        const confirmDelete = window.confirm("Are you sure you want to remove this employee?");
        if (confirmDelete) {
            setIsLoading(true);
            try {
                await API.delete(`/api/employees/${employeeId}`);
                fetchEmployeesAndPerformance();
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to delete employee.');
                setIsLoading(false);
            }
        }
    };
    
    return (
        <div className="profile-container">
            <h2>Your Profile</h2>
            {isLoading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="profile-details-card">
                <h3>{user?.name}</h3>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                {user?.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                {user?.payRate && <p><strong>Pay Rate:</strong> ₹{user.payRate}</p>}
            </div>

            {(user?.role === 'Owner' || user?.role === 'Manager') && (
                <AddEmployeeForm onEmployeeAdded={fetchEmployeesAndPerformance} setIsLoading={setIsLoading} />
            )}

            <h3>Employee Directory</h3>
            <div className="employee-list-container">
                <table className="employee-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Total Sales (₹)</th>
                            <th>Bills Handled</th>
                            {(user?.role === 'Owner' || user?.role === 'Manager') && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => {
                            const empPerformance = performanceMap.get(emp._id.toString());
                            return (
                                <tr key={emp._id}>
                                    <td data-label="Name">{emp.name}</td>
                                    <td data-label="Email">{emp.email}</td>
                                    <td data-label="Role">{emp.role}</td>
                                    <td data-label="Total Sales (₹)">₹{empPerformance?.totalSales?.toFixed(2) || '0.00'}</td>
                                    <td data-label="Bills Handled">{empPerformance?.billsCount || 0}</td>
                                    {(user?.role === 'Owner' || user?.role === 'Manager') && (
                                        <td data-label="Actions">
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