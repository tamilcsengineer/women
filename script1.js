const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Database connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/location', require('./routes/location'));
app.use('/api/voice', require('./routes/voice'));

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their room
  socket.on('join-user', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  
  // Handle location updates
  socket.on('location-update', (data) => {
    // Broadcast to user's trusted contacts
    socket.to(data.userId).emit('location-changed', data);
  });
  
  // Handle emergency alerts
  socket.on('emergency-alert', (data) => {
    // Notify all trusted contacts
    data.contacts.forEach(contactId => {
      socket.to(contactId).emit('emergency-notification', data);
    });
  });
  
  // Handle live camera streaming
  socket.on('camera-stream', (data) => {
    // Broadcast to trusted contacts
    data.contacts.forEach(contactId => {
      socket.to(contactId).emit('camera-data', data);
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});