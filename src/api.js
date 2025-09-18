import axios from "axios";

// ✅ Use environment variable or fallback for flexibility
const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://komsyte-restro-backend.onrender.com",
});

// ✅ Automatically attach token (if available) to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
