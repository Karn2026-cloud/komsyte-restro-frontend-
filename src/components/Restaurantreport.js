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
            setReportData(data);
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

    // Destructure all necessary data from the API response
    const { kpis, salesTrend, topItems, employeePerformance } = reportData || {};

    // Prepare data for the sales trend chart
    const chartData = {
        labels: salesTrend?.labels || [],
        datasets: [
            {
                label: 'Total Sales (₹)',
                data: salesTrend?.data || [],
                fill: false,
                backgroundColor: 'rgb(75, 192, 192)',
                borderColor: 'rgba(75, 192, 192, 0.8)',
                tension: 0.1
            }
        ]
    };
    
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Sales Trend Overview'
            }
        }
    };

    return (
        <div className="report-page-container">
            <h2 className="page-title">Restaurant Dashboard</h2>

            {/* --- Key Performance Indicator (KPI) Cards --- */}
            <div className="report-section kpi-cards">
                <div className="kpi-card">
                    <h4>Total Revenue</h4>
                    <p>₹{kpis?.totalRevenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="kpi-card">
                    <h4>Total Orders</h4>
                    <p>{kpis?.totalOrders || 0}</p>
                </div>
                <div className="kpi-card">
                    <h4>Average Order Value</h4>
                    <p>₹{kpis?.averageOrderValue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="kpi-card">
                    <h4>New Customers</h4>
                    <p>{kpis?.newCustomers || 0}</p>
                </div>
            </div>

            {/* --- Sales Trend Chart --- */}
            <div className="report-section sales-chart">
                <h3>Sales Trend</h3>
                <Line options={chartOptions} data={chartData} />
            </div>

            {/* --- Top Selling Items --- */}
            <div className="report-section top-items">
                <h3>Top Selling Items</h3>
                <div className="report-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Quantity Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topItems && topItems.length > 0 ? (
                                topItems.map((item) => (
                                    <tr key={item.name}>
                                        <td>{item.name}</td>
                                        <td>{item.totalQuantity}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="no-data-cell">No item data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- Employee Performance Table --- */}
            <div className="report-section employee-performance">
                <h3>Employee Performance</h3>
                <div className="report-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Employee Name</th>
                                <th>Bills Handled</th>
                                <th>Total Sales (₹)</th>
                                <th>Avg. Order Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeePerformance && employeePerformance.length > 0 ? (
                                employeePerformance.map((employee, index) => (
                                    <tr key={employee.workerId || index}>
                                        <td><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span></td>
                                        <td>{employee.workerName}</td>
                                        <td>{employee.billsCount}</td>
                                        <td>₹{employee.totalSales.toFixed(2)}</td>
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