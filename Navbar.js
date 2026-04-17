import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/messages/unread/count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">💪</span>
          <span className="logo-text">ComboMaster Fitness</span>
        </Link>

        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
          <Link to="/transformations" onClick={() => setMobileMenuOpen(false)}>Transformations</Link>
          <Link to="/blog" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
          
          {user ? (
            <>
              <Link to="/member" className="nav-link-with-badge" onClick={() => setMobileMenuOpen(false)}>
                Member Portal
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
              )}
              <div className="user-menu">
                <span className="user-name">👤 {user.name}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn-register" onClick={() => setMobileMenuOpen(false)}>Join Now</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;