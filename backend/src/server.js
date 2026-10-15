const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();
app.use((req, res, next) => {
  console.log('INCOMING REQUEST:', req.method, req.originalUrl);
  next();
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', streakRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'VELoop Daily Streak API is running',
    status: 'success'
  });
});
app.get('/health', (req, res) => {
  console.log('HEALTH ROUTE HIT');

  res.status(200).json({
    success: true,
    message: 'Backend is reachable',
    path: req.path
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  }
}

startServer();
