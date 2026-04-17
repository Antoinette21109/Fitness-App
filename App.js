import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import HomePage from './components/HomePage';
import MemberPortal from './components/MemberPortal';
import Shop from './components/Shop';
import Transformations from './components/Transformations';
import Blog from './components/Blog';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import Register from './components/Register';
import Navbar from './components/Navbar';
import './App.css';

axios.defaults.baseURL = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);
    }
  }, [token]);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleLogin} />} />
          <Route path="/member" element={user ? <MemberPortal user={user} /> : <Navigate to="/login" />} />
          <Route path="/shop" element={<Shop user={user} />} />
          <Route path="/transformations" element={<Transformations user={user} />} />
          <Route path="/blog" element={<Blog user={user} />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;