import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Report.css';

// Register Chart.js components to be used
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Reports() {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch the main dashboard report from the backend
    const fetchDashboardReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await API.get('/api/reports/dashboard');
            // Ensure data properties are valid and handle missing values
            setReportData({
                totalRevenue: data.totalRevenue || 0,
                dailySales: Array.isArray(data.dailySales) ? data.dailySales : [],
                topSellingItems: Array.isArray(data.topSellingItems) ? data.topSellingItems : [],
                employeePerformance: Array.isArray(data.employeePerformance) ? data.employeePerformance : []
            });
        } catch (err) {
            setError('Failed to fetch dashboard report. Please try again later.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardReport();
    }, [fetchDashboardReport]);

    if (isLoading) {
        return <div className="loading-container">Loading Dashboard...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }
    
    // Prepare chart data and options
    const salesChartData = {
        labels: reportData?.dailySales.map(item => item._id),
        datasets: [{
            label: 'Total Daily Sales',
            data: reportData?.dailySales.map(item => item.totalSales),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    const topItemsChartData = {
        labels: reportData?.topSellingItems.map(item => item.name),
        datasets: [{
            label: 'Items Sold',
            data: reportData?.topSellingItems.map(item => item.totalQuantity),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const employeePerformance = reportData?.employeePerformance || [];

    return (
        <div className="reports-container">
            <h2 className="section-title">Reports & Analytics</h2>

            {/* Overall Summary Section */}
            <div className="reports-summary-cards">
                <div className="summary-card">
                    <h4>Total Revenue</h4>
                    <p className="summary-value">₹{reportData.totalRevenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="summary-card">
                    <h4>Top Selling Item</h4>
                    <p className="summary-value">
                        {reportData.topSellingItems.length > 0 ? reportData.topSellingItems[0].name : 'N/A'}
                    </p>
                </div>
                <div className="summary-card">
                    <h4>Top Performer</h4>
                    <p className="summary-value">
                        {reportData.employeePerformance.length > 0 ? reportData.employeePerformance[0].workerName : 'N/A'}
                    </p>
                </div>
            </div>

            <div className="reports-content">
                {/* Daily Sales Chart */}
                <div className="chart-container">
                    <h3>Daily Sales</h3>
                    {reportData.dailySales.length > 0 ? (
                        <Line data={salesChartData} />
                    ) : (
                        <p className="no-data-message">No daily sales data available.</p>
                    )}
                </div>

                {/* Top Selling Items Chart */}
                <div className="chart-container">
                    <h3>Top Selling Items (by Quantity)</h3>
                    {reportData.topSellingItems.length > 0 ? (
                        <Line data={topItemsChartData} />
                    ) : (
                        <p className="no-data-message">No top selling items data available.</p>
                    )}
                </div>

                {/* Employee Performance Table */}
                <div className="table-container">
                    <h3>Employee Performance</h3>
                    <table className="employee-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Worker Name</th>
                                <th>Bills Handled</th>
                                <th>Total Sales (₹)</th>
                                <th>Avg. Order Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeePerformance.length > 0 ? (
                                employeePerformance.map((employee, index) => (
                                    <tr key={employee.workerId || index}>
                                        <td><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span></td>
                                        <td>{employee.workerName}</td>
                                        <td>{employee.billsCount}</td>
                                        <td>₹{employee.totalSales?.toFixed(2) || '0.00'}</td>
                                        <td>₹{employee.aov ? employee.aov.toFixed(2) : '0.00'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="no-data-cell">No performance data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}