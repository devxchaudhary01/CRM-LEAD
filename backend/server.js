const express        = require('express');
const cors           = require('cors');
const dotenv         = require('dotenv');
dotenv.config();
const fs             = require('fs');
const session        = require('express-session');
const passport       = require('./config/passport');
const connectDB      = require('./config/db');

connectDB();

const app = express();
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// ── Session (required for passport Google OAuth callback) ─────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'crm_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 10 * 60 * 1000 }, // 10 min — only for OAuth flow
}));

// ── Passport ──────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Body parsers ──────────────────────────────────────────────────
// NOTE: webhook route uses raw body — must be registered BEFORE express.json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/auth/google',    require('./routes/googleAuthRoutes'));
app.use('/api/leads',          require('./routes/leadRoutes'));
app.use('/api/sheets',         require('./routes/sheetsRoutes'));
app.use('/api/payment',        require('./routes/paymentRoutes'));

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok:true, time:new Date() }));

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(500).json({ success:false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CRM API  →  http://localhost:${PORT}`);
  console.log(`🔑 Google OAuth  →  http://localhost:${PORT}/api/auth/google`);
});
