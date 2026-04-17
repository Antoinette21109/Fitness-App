import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'supplement',
    stock: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(newProduct).forEach(key => {
      formData.append(key, newProduct[key]);
    });
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      await axios.post('/api/products', formData);
      alert('Product added successfully!');
      fetchProducts();
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: 'supplement',
        stock: '',
      });
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status });
      fetchOrders();
      alert('Order status updated!');
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user.name}</p>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          User Management
        </button>
        <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
          Product Management
        </button>
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
          Order Management
        </button>
        <button className={activeTab === 'content' ? 'active' : ''} onClick={() => setActiveTab('content')}>
          Content Management
        </button>
        <button className={activeTab === 'marketing' ? 'active' : ''} onClick={() => setActiveTab('marketing')}>
          Marketing Tools
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-stats">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <div className="stat-number">{stats.totalUsers || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Orders</h3>
                <div className="stat-number">{stats.totalOrders || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <div className="stat-number">${stats.totalRevenue?.toLocaleString() || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Conversion Rate</h3>
                <div className="stat-number">24%</div>
              </div>
            </div>

            <div className="charts-container">
              <div className="chart">
                <h3>Revenue Trend</h3>
                <LineChart width={600} height={300} data={[
                  { month: 'Jan', revenue: 5000 },
                  { month: 'Feb', revenue: 7000 },
                  { month: 'Mar', revenue: 8000 },
                  { month: 'Apr', revenue: 10000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                </LineChart>
              </div>

              <div className="chart">
                <h3>Recent Orders</h3>
                <div className="recent-orders">
                  {stats.recentOrders?.map(order => (
                    <div key={order._id} className="order-item">
                      <span>{order.user?.name}</span>
                      <span>${order.totalAmount}</span>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="user-management">
            <h2>User Management</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Membership</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.membershipType}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-edit">Edit</button>
                      <button className="btn-view">View Progress</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="product-management">
            <div className="add-product-form">
              <h2>Add New Product</h2>
              <form onSubmit={handleProductSubmit}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} rows="3"></textarea>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                    <option value="supplement">Supplement</option>
                    <option value="attire">Gym Attire</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input type="number" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Product Images</label>
                  <input type="file" multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files))} accept="image/*" />
                </div>
                <button type="submit" className="btn-submit">Add Product</button>
              </form>
            </div>

            <div className="products-list">
              <h2>Existing Products</h2>
              <div className="products-grid">
                {products.map(product => (
                  <div key={product._id} className="product-card">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-price">${product.price}</div>
                    <div className="product-stock">Stock: {product.stock}</div>
                    <button className="btn-edit">Edit</button>
                    <button className="btn-delete">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="order-management">
            <h2>Order Management</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td>{order._id.slice(-6)}</td>
                    <td>{order.user?.name}</td>
                    <td>${order.totalAmount}</td>
                    <td>
                      <select value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-view">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="marketing-tools">
            <h2>Email Campaigns</h2>
            <div className="campaign-form">
              <div className="form-group">
                <label>Campaign Name</label>
                <input type="text" placeholder="Summer Sale 2024" />
              </div>
              <div className="form-group">
                <label>Subject Line</label>
                <input type="text" placeholder="Get 20% off on all supplements!" />
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <select>
                  <option>All Members</option>
                  <option>Active Subscribers</option>
                  <option>Inactive Users</option>
                  <option>Premium Members</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email Content</label>
                <textarea rows="8" placeholder="Write your email campaign content here..."></textarea>
              </div>
              <button className="btn-submit">Send Campaign</button>
            </div>

            <div className="promotions-section">
              <h2>Active Promotions</h2>
              <div className="promotions-list">
                <div className="promotion-card">
                  <h3>New Year Special</h3>
                  <p>30% off on annual memberships</p>
                  <span className="discount">Code: NEWYEAR2024</span>
                </div>
                <div className="promotion-card">
                  <h3>Referral Bonus</h3>
                  <p>Get $50 credit for each referral</p>
                  <span className="discount">Active until Dec 31</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;