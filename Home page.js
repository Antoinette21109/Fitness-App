import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = ({ user }) => {
  return (
    <div className="homepage">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to ComboMaster Fitness</h1>
          <p>Transform your body, master your fitness journey</p>
          {!user && (
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">Start Your Journey</Link>
              <Link to="/login" className="btn btn-secondary">Login</Link>
            </div>
          )}
          {user && (
            <Link to="/member" className="btn btn-primary">Go to Member Portal</Link>
          )}
        </div>
      </section>

      <section className="services">
        <h2>Our Services</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Personal Training</h3>
            <p>Customized workout plans tailored to your goals</p>
          </div>
          <div className="service-card">
            <h3>Nutrition Plans</h3>
            <p>Science-based meal plans for optimal results</p>
          </div>
          <div className="service-card">
            <h3>Fitness Shop</h3>
            <p>Premium supplements, attire, and equipment</p>
          </div>
          <div className="service-card">
            <h3>Community Support</h3>
            <p>Connect with coaches and like-minded individuals</p>
          </div>
        </div>
      </section>

      <section className="quick-access">
        <h2>Quick Access</h2>
        <div className="quick-buttons">
          <Link to="/shop" className="quick-btn">Shop Now</Link>
          <Link to="/transformations" className="quick-btn">View Transformations</Link>
          <Link to="/blog" className="quick-btn">Read Blog</Link>
          {user && <Link to="/member" className="quick-btn">Member Portal</Link>}
        </div>
      </section>

      <section className="features">
        <h2>Why Choose ComboMaster?</h2>
        <div className="features-grid">
          <div className="feature">
            <h3>✓ Personalized Programs</h3>
            <p>AI-powered workout and nutrition plans</p>
          </div>
          <div className="feature">
            <h3>✓ Expert Coaches</h3>
            <p>24/7 support from certified professionals</p>
          </div>
          <div className="feature">
            <h3>✓ Track Progress</h3>
            <p>Comprehensive analytics and progress photos</p>
          </div>
          <div className="feature">
            <h3>✓ Premium Products</h3>
            <p>Curated fitness gear and supplements</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;