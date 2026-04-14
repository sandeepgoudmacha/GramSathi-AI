require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { initDb } = require('./db/database');
const { initWS } = require('./services/wsService');
const apiRouter = require('./routes/api');
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: [process.env.FRONTEND_URL||'http://localhost:5173','http://localhost:3000','http://127.0.0.1:5173'], credentials: true, methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(':method :url :status - :response-time ms'));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500, message: { detail: 'Too many requests' }, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/auth/login', rateLimit({ windowMs: 15*60*1000, max: 30, message: { detail: 'Too many login attempts' } }));
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR||'./uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api/v1', apiRouter);
app.get('/health', (req, res) => res.json({ status: 'healthy', version: '2.0.0', uptime: Math.round(process.uptime()), db: 'sqlite' }));
app.use('/api', (req, res) => res.status(404).json({ detail: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => { console.error(err.message); res.status(err.status||500).json({ detail: err.message||'Internal error' }); });
initDb();
initWS(server);

// Health check for required dependencies
const requiredEnvs = { GROQ_API_KEY: 'Groq', GEMINI_API_KEY: 'Gemini' };
const missingKeys = Object.entries(requiredEnvs)
  .filter(([key]) => !process.env[key])
  .map(([, name]) => name);
if (missingKeys.length > 0) {
  console.warn(`⚠️  Missing API keys for: ${missingKeys.join(', ')}. AI features will have limited functionality. Set GROQ_API_KEY or GEMINI_API_KEY in .env`);
}

server.listen(PORT, () => console.log(`\n🌱 GramSathi AI Backend running on http://localhost:${PORT}\n   API: http://localhost:${PORT}/api/v1\n   WS:  ws://localhost:${PORT}/ws\n${missingKeys.length ? `⚠️  AI Provider Status: ${missingKeys.length === 0 ? '✅ Ready' : '⚠️  Limited (missing ' + missingKeys.join(', ') + ')'}\n` : ''}`));

module.exports = { app, server };
