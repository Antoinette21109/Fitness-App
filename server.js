const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/combo_master_fitness', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['member', 'coach', 'admin'], default: 'member' },
  membershipType: { type: String, enum: ['basic', 'premium', 'elite'], default: 'basic' },
  subscriptionEndDate: Date,
  createdAt: { type: Date, default: Date.now },
  profilePicture: String,
  fitnessGoals: [String],
  weight: Number,
  height: Number,
  age: Number,
});

const WorkoutSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  duration: Number,
  exercises: [{
    name: String,
    sets: Number,
    reps: Number,
    weight: Number,
    videoUrl: String,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const MealPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  calories: Number,
  meals: [{
    type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    name: String,
    ingredients: [String],
    instructions: String,
    calories: Number,
  }],
  dietaryRestrictions: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String, enum: ['supplement', 'attire', 'equipment'] },
  stock: { type: Number, default: 0 },
  images: [String],
  specifications: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
  }],
  totalAmount: Number,
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  paymentMethod: String,
  createdAt: { type: Date, default: Date.now },
});

const TransformationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  beforeImage: String,
  afterImage: String,
  startWeight: Number,
  currentWeight: Number,
  duration: Number,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false },
});

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  tags: [String],
  image: String,
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  weight: Number,
  bodyFat: Number,
  muscleMass: Number,
  measurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    arms: Number,
    thighs: Number,
  },
  notes: String,
  photos: [String],
});

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const models = {
  User: mongoose.model('User', UserSchema),
  Workout: mongoose.model('Workout', WorkoutSchema),
  MealPlan: mongoose.model('MealPlan', MealPlanSchema),
  Product: mongoose.model('Product', ProductSchema),
  Order: mongoose.model('Order', OrderSchema),
  Transformation: mongoose.model('Transformation', TransformationSchema),
  Blog: mongoose.model('Blog', BlogSchema),
  Progress: mongoose.model('Progress', ProgressSchema),
  Message: mongoose.model('Message', MessageSchema),
};

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const user = await models.User.findById(decoded.userId);
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new models.User({ name, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey');
    res.status(201).json({ user: { id: user._id, name, email, role: user.role }, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await models.User.findOne({ email });
    if (!user) throw new Error('Invalid credentials');
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid credentials');
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey');
    res.json({ user: { id: user._id, name: user.name, email, role: user.role }, token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// User Management
app.get('/api/users', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const users = await models.User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', auth.authenticate, async (req, res) => {
  try {
    const updates = ['name', 'membershipType', 'fitnessGoals', 'weight', 'height', 'age'];
    const updateData = {};
    updates.forEach(update => {
      if (req.body[update] !== undefined) updateData[update] = req.body[update];
    });
    
    const user = await models.User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Workout Plans
app.post('/api/workouts', auth.authenticate, auth.isAdmin, async (req, res) =>
  try {
    const workouts = await models.Workout.find().populate('createdBy', 'name');
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workouts', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const workout = new models.Workout({ ...req.body, createdBy: req.user._id });
    await workout.save();
    res.status(201).json(workout);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Meal Plans
app.get('/api/meal-plans', auth.isAdmin, async (req, res) => {
  try {
    const mealPlans = await models.MealPlan.find().populate('createdBy', 'name');
    res.json(mealPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meal-plans', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const mealPlan = new models.MealPlan({ ...req.body, createdBy: req.user._id });
    await mealPlan.save();
    res.status(201).json(mealPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const products = await models.Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', auth.authenticate, auth.isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const imagePaths = req.files.map(file => file.path);
    const product = new models.Product({ ...req.body, images: imagePaths });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const product = await models.Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/products/:id', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    await models.Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders
app.post('/api/orders', auth.authenticate, async (req, res) => {
  try {
    const order = new models.Order({ ...req.body, user: req.user._id });
    await order.save();
    
    // Update product stock
    for (const item of order.products) {
      await models.Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders', auth.authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };
    const orders = await models.Order.find(query).populate('products.product');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id/status', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const order = await models.Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Transformations
app.get('/api/transformations', async (req, res) => {
  try {
    const transformations = await models.Transformation.find({ approved: true })
      .populate('user', 'name profilePicture')
      .sort('-createdAt');
    res.json(transformations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transformations', authMiddleware, upload.fields([{ name: 'beforeImage' }, { name: 'afterImage' }]), async (req, res) => {
  try {
    const transformation = new models.Transformation({
      ...req.body,
      user: req.user._id,
      beforeImage: req.files.beforeImage?.[0]?.path,
      afterImage: req.files.afterImage?.[0]?.path,
    });
    await transformation.save();
    res.status(201).json(transformation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await models.Blog.find().populate('author', 'name').sort('-createdAt');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/blogs', auth.authenticate, auth.isAdmin, upload.single('image'), async (req, res) => {
  try {
    const blog = new models.Blog({
      ...req.body,
      author: req.user._id,
      image: req.file?.path,
    });
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Progress Tracking
app.post('/api/progress', auth.authenticate, upload.array('photos', 5), async (req, res) => {
  try {
    const photoPaths = req.files.map(file => file.path);
    const progress = new models.Progress({ ...req.body, user: req.user._id, photos: photoPaths });
    await progress.save();
    res.status(201).json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progress = await models.Progress.find({ user: req.user._id }).sort('-date');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages/Chat
app.get('/api/messages/:userId', auth.authenticate, async (req, res) => {
  try {
    const messages = await models.Message.find({
      $or: [
        { from: req.user._id, to: req.params.userId },
        { from: req.params.userId, to: req.user._id },
      ],
    }).populate('from to', 'name').sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', auth.authenticate, async (req, res) => {
  try {
    const message = new models.Message({
      from: req.user._id,
      to: req.body.to,
      message: req.body.message,
    });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dashboard Stats
app.get('/api/admin/stats', auth.authenticate, auth.isAdmin, async (req, res) => {
  try {
    const totalUsers = await models.User.countDocuments();
    const totalOrders = await models.Order.countDocuments();
    const totalRevenue = await models.Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const recentOrders = await models.Order.find().populate('user', 'name').sort('-createdAt').limit(5);
    const popularProducts = await models.Order.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.product', totalSold: { $sum: '$products.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);
    
    res.json({
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentOrders,
      popularProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Add these missing routes to server/server.js

// Get user profile
app.get('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const user = await models.User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const updates = ['name', 'weight', 'height', 'age', 'fitnessGoals', 'profilePicture'];
    const updateData = {};
    updates.forEach(update => {
      if (req.body[update] !== undefined) updateData[update] = req.body[update];
    });
    
    const user = await models.User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get coaches list
app.get('/api/coaches', authMiddleware, async (req, res) => {
  try {
    const coaches = await models.User.find({ role: 'coach' }).select('name email profilePicture');
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages with specific user
app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await models.Message.find({
      $or: [
        { from: req.user._id, to: req.params.userId },
        { from: req.params.userId, to: req.user._id }
      ]
    }).populate('from to', 'name').sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
app.put('/api/messages/read/:userId', authMiddleware, async (req, res) => {
  try {
    await models.Message.updateMany(
      { from: req.params.userId, to: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count
app.get('/api/messages/unread/count', authMiddleware, async (req, res) => {
  try {
    const count = await models.Message.countDocuments({ to: req.user._id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transformation by ID
app.get('/api/transformations/:id', async (req, res) => {
  try {
    const transformation = await models.Transformation.findById(req.params.id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name');
    res.json(transformation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike transformation
app.post('/api/transformations/:id/like', authMiddleware, async (req, res) => {
  try {
    const transformation = await models.Transformation.findById(req.params.id);
    const likeIndex = transformation.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      transformation.likes.splice(likeIndex, 1);
    } else {
      transformation.likes.push(req.user._id);
    }
    
    await transformation.save();
    res.json({ likes: transformation.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to transformation
app.post('/api/transformations/:id/comments', authMiddleware, async (req, res) => {
  try {
    const transformation = await models.Transformation.findById(req.params.id);
    transformation.comments.push({
      user: req.user._id,
      text: req.body.text
    });
    await transformation.save();
    
    const updatedTransformation = await models.Transformation.findById(req.params.id)
      .populate('comments.user', 'name');
    res.json(updatedTransformation.comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blog post by ID
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await models.Blog.findById(req.params.id).populate('author', 'name');
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    
    blog.views += 1;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like blog post
app.post('/api/blogs/:id/like', authMiddleware, async (req, res) => {
  try {
    const blog = await models.Blog.findById(req.params.id);
    const likeIndex = blog.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      blog.likes.splice(likeIndex, 1);
    } else {
      blog.likes.push(req.user._id);
    }
    
    await blog.save();
    res.json({ likes: blog.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's assigned programs
app.get('/api/user/programs', authMiddleware, async (req, res) => {
  try {
    // Get the user's purchased or assigned programs
    const userPrograms = await models.UserProgram.find({ user: req.user._id })
      .populate('workout')
      .populate('mealPlan');
    res.json(userPrograms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create checkout session (simplified)
app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { products } = req.body;
    // Calculate total amount
    let totalAmount = 0;
    for (const item of products) {
      const product = await models.Product.findById(item.productId);
      totalAmount += product.price * item.quantity;
    }
    
    // Create order
    const order = new models.Order({
      user: req.user._id,
      products: products.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      status: 'pending'
    });
    
    await order.save();
    res.json({ orderId: order._id, totalAmount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add UserProgram model
const UserProgramSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workout: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout' },
  mealPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan' },
  assignedDate: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false }
});

models.UserProgram = mongoose.model('UserProgram', UserProgramSchema);
// Import auth module
const auth = require('./auth');

// Replace the existing User model with the one from auth
// Remove the old UserSchema definition and use auth.User

// Enhanced Registration with Email Verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = await auth.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await auth.hashPassword(password);
    
    // Create user
    const user = new auth.User({ 
      name, 
      email, 
      password: hashedPassword,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Generate email verification token
    const verificationToken = await auth.generateEmailVerificationToken(user._id);
    
    // In production, send verification email here
    console.log(`Verification token for ${email}: ${verificationToken}`);
    
    // Generate JWT token
    const token = auth.generateToken(user._id, user.email, user.role);
    
    res.status(201).json({ 
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        emailVerified: user.emailVerified
      }, 
      token 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Enhanced Login with Rate Limiting
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check rate limit
    if (!auth.checkRateLimit(email)) {
      return res.status(429).json({ 
        error: 'Too many login attempts',
        message: 'Please try again after 15 minutes' 
      });
    }
    
    // Find user
    const user = await auth.User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.' 
      });
    }
    
    // Verify password
    const isValid = await auth.comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Log activity
    await auth.logUserActivity(user._id, 'login', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Generate token
    const token = auth.generateToken(user._id, user.email, user.role);
    
    res.json({ 
      success: true,
      message: 'Login successful',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        membershipType: user.membershipType,
        emailVerified: user.emailVerified
      }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Email Verification
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await auth.verifyEmailToken(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    res.json({ 
      success: true, 
      message: 'Email verified successfully. You can now login.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Resend Verification Email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await auth.User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    const verificationToken = await auth.generateEmailVerificationToken(user._id);
    console.log(`New verification token for ${email}: ${verificationToken}`);
    
    res.json({ 
      success: true, 
      message: 'Verification email sent. Please check your inbox.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await auth.User.findOne({ email });
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with that email, you will receive a password reset link.' 
      });
    }
    
    const resetToken = await auth.generatePasswordResetToken(email);
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset instructions sent to your email.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = await auth.verifyPasswordResetToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await auth.hashPassword(password);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change Password (Authenticated)
app.post('/api/auth/change-password', auth.authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const user = await auth.User.findById(req.user._id);
    const isValid = await auth.comparePassword(currentPassword, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await auth.hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();
    
    await auth.logUserActivity(user._id, 'password_change', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (invalidate token on client side)
app.post('/api/auth/logout', auth.authenticate, async (req, res) => {
  try {
    await auth.logUserActivity(req.user._id, 'logout', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh Token
app.post('/api/auth/refresh-token', auth.authenticate, async (req, res) => {
  try {
    const newToken = auth.generateToken(req.user._id, req.user.email, req.user.role);
    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const user = await auth.User.findById(req.user._id)
      .select('-password -resetPasswordToken -verificationToken');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update User Profile
app.put('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'weight', 'height', 'age', 'fitnessGoals', 'profilePicture'];
    const updates = {};
    
    allowedUpdates.forEach(update => {
      if (req.body[update] !== undefined) {
        updates[update] = req.body[update];
      }
    });
    
    const user = await auth.User.findByIdAndUpdate(
      req.user._id, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');
    
    await auth.logUserActivity(user._id, 'profile_update', {
      updates: Object.keys(updates),
      ip: req.ip
    });
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete Account (with confirmation)
app.delete('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password required for account deletion' });
    }
    
    const user = await auth.User.findById(req.user._id);
    const isValid = await auth.comparePassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();
    
    await auth.logUserActivity(user._id, 'account_deletion', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Account deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
// Import auth module
const auth = require('./auth');

// Replace the existing User model with the one from auth
// Remove the old UserSchema definition and use auth.User

// Enhanced Registration with Email Verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = await auth.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await auth.hashPassword(password);
    
    // Create user
    const user = new auth.User({ 
      name, 
      email, 
      password: hashedPassword,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Generate email verification token
    const verificationToken = await auth.generateEmailVerificationToken(user._id);
    
    // In production, send verification email here
    console.log(`Verification token for ${email}: ${verificationToken}`);
    
    // Generate JWT token
    const token = auth.generateToken(user._id, user.email, user.role);
    
    res.status(201).json({ 
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        emailVerified: user.emailVerified
      }, 
      token 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Enhanced Login with Rate Limiting
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check rate limit
    if (!auth.checkRateLimit(email)) {
      return res.status(429).json({ 
        error: 'Too many login attempts',
        message: 'Please try again after 15 minutes' 
      });
    }
    
    // Find user
    const user = await auth.User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.' 
      });
    }
    
    // Verify password
    const isValid = await auth.comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Log activity
    await auth.logUserActivity(user._id, 'login', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Generate token
    const token = auth.generateToken(user._id, user.email, user.role);
    
    res.json({ 
      success: true,
      message: 'Login successful',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        membershipType: user.membershipType,
        emailVerified: user.emailVerified
      }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Email Verification
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await auth.verifyEmailToken(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    res.json({ 
      success: true, 
      message: 'Email verified successfully. You can now login.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Resend Verification Email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await auth.User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    const verificationToken = await auth.generateEmailVerificationToken(user._id);
    console.log(`New verification token for ${email}: ${verificationToken}`);
    
    res.json({ 
      success: true, 
      message: 'Verification email sent. Please check your inbox.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await auth.User.findOne({ email });
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with that email, you will receive a password reset link.' 
      });
    }
    
    const resetToken = await auth.generatePasswordResetToken(email);
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset instructions sent to your email.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = await auth.verifyPasswordResetToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await auth.hashPassword(password);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change Password (Authenticated)
app.post('/api/auth/change-password', auth.authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const user = await auth.User.findById(req.user._id);
    const isValid = await auth.comparePassword(currentPassword, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await auth.hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();
    
    await auth.logUserActivity(user._id, 'password_change', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (invalidate token on client side)
app.post('/api/auth/logout', auth.authenticate, async (req, res) => {
  try {
    await auth.logUserActivity(req.user._id, 'logout', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh Token
app.post('/api/auth/refresh-token', auth.authenticate, async (req, res) => {
  try {
    const newToken = auth.generateToken(req.user._id, req.user.email, req.user.role);
    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const user = await auth.User.findById(req.user._id)
      .select('-password -resetPasswordToken -verificationToken');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update User Profile
app.put('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'weight', 'height', 'age', 'fitnessGoals', 'profilePicture'];
    const updates = {};
    
    allowedUpdates.forEach(update => {
      if (req.body[update] !== undefined) {
        updates[update] = req.body[update];
      }
    });
    
    const user = await auth.User.findByIdAndUpdate(
      req.user._id, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');
    
    await auth.logUserActivity(user._id, 'profile_update', {
      updates: Object.keys(updates),
      ip: req.ip
    });
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete Account (with confirmation)
app.delete('/api/auth/me', auth.authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password required for account deletion' });
    }
    
    const user = await auth.User.findById(req.user._id);
    const isValid = await auth.comparePassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();
    
    await auth.logUserActivity(user._id, 'account_deletion', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ 
      success: true, 
      message: 'Account deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});