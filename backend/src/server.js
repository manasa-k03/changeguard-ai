require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDb } = require('./database');
const authRoutes = require('./routes/auth');
const analysesRoutes = require('./routes/analyses');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Health check (no auth needed)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    aiMode: process.env.OPENAI_API_KEY ? 'openai' : 'demo',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyses', analysesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Boot sequence: init DB first, then listen ──────────────────────────────
const start = async () => {
  try {
    console.log('\n🛡️  ChangeGuard AI Backend — starting...');
    console.log('  Initialising database...');
    await initDb();

    app.listen(PORT, () => {
      console.log(`  ✔ Listening on port ${PORT}`);
      console.log(`  ✔ Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  ✔ AI mode     : ${process.env.OPENAI_API_KEY ? 'OpenAI GPT-3.5' : 'Demo (no key)'}`);
      console.log(`  ✔ Health URL  : http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
};

start();

module.exports = app;
