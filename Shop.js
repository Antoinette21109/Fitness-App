import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Shop.css';

const Shop = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product._id);
    if (existingItem) {
      const updatedCart = cart.map(item =>
        item.productId === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCart(updatedCart);
    } else {
      saveCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0]
      }]);
    }
  };

  const updateQuantity = (productId, change) => {
    const updatedCart = cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item !== null);
    saveCart(updatedCart);
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(item => item.productId !== productId);
    saveCart(updatedCart);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Please login to checkout');
      return;
    }

    try {
      const response = await axios.post('/api/create-checkout-session', {
        products: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      });
      
      alert(`Order placed! Total: $${response.data.totalAmount}`);
      saveCart([]);
      setShowCart(false);
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1>Fitness Shop</h1>
        <button className="cart-icon" onClick={() => setShowCart(true)}>
          🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
      </div>

      <div className="category-filters">
        <button 
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          All Products
        </button>
        <button 
          className={selectedCategory === 'supplement' ? 'active' : ''}
          onClick={() => setSelectedCategory('supplement')}
        >
          Supplements
        </button>
        <button 
          className={selectedCategory === 'attire' ? 'active' : ''}
          onClick={() => setSelectedCategory('attire')}
        >
          Gym Attire
        </button>
        <button 
          className={selectedCategory === 'equipment' ? 'active' : ''}
          onClick={() => setSelectedCategory('equipment')}
        >
          Equipment
        </button>
      </div>

      <div className="products-grid">
        {filteredProducts.map(product => (
          <div key={product._id} className="product-card">
            <div className="product-image">
              {product.images?.[0] ? (
                <img src={`http://localhost:5000/${product.images[0]}`} alt={product.name} />
              ) : (
                <div className="image-placeholder">🏋️‍♂️</div>
              )}
            </div>
            <div className="product-info">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-price">${product.price}</div>
              <div className="product-stock">
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </div>
              <button 
                className="btn-add-to-cart"
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCart && (
        <div className="cart-modal">
          <div className="cart-modal-content">
            <div className="cart-header">
              <h2>Your Cart</h2>
              <button className="close-btn" onClick={() => setShowCart(false)}>×</button>
            </div>
            {cart.length === 0 ? (
              <p className="empty-cart">Your cart is empty</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.productId} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p>${item.price}</p>
                      </div>
                      <div className="cart-item-controls">
                        <button onClick={() => updateQuantity(item.productId, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)}>+</button>
                        <button className="remove-btn" onClick={() => removeFromCart(item.productId)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <h3>Total: ${getCartTotal().toFixed(2)}</h3>
                  <button className="checkout-btn" onClick={handleCheckout}>
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;