require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { setupSocket } = require('./socket');
const { attachYjs } = require('./yjs/server');

for (const k of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`Missing ${k}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();
const server = http.createServer(app);

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/rooms/:roomId/files', require('./routes/files'));
app.use('/api/rooms/:roomId/ai', require('./routes/ai'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const io = setupSocket(server);
app.set('io', io);
attachYjs(server);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => server.listen(PORT, () => console.log(`Server on :${PORT}`)))
  .catch((e) => {
    console.error('Failed to start:', e.message);
    process.exit(1);
  });
