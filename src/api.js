import axios from 'axios';

// Create a central instance of axios for all API calls
const API = axios.create({
    baseURL: 'http://localhost:5000', // Your backend server URL
});

// This special function (an interceptor) automatically adds the
// authentication token from localStorage to every API request.
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export default API;