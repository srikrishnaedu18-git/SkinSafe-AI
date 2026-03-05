import 'dotenv/config';
import { createServer } from 'node:http';
import { handleAiHealth, handleAiPredict } from './routes/ai.js';
import { handleCompatibilityCheck } from './routes/compatibility.js';
import { handleFeedback, handleGetProfile, handleProductResolve, handleProductVerify, handleProfile } from './routes/prototype.js';
import { handleLogin, handleLogout, handleMe, handleRegister } from './routes/auth.js';

const PORT = Number(process.env.PORT ?? 8080);

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/auth/register') {
    await handleRegister(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/auth/login') {
    await handleLogin(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/auth/logout') {
    await handleLogout(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/auth/me') {
    await handleMe(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/compatibility/check') {
    await handleCompatibilityCheck(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/ai/predict') {
    await handleAiPredict(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/ai/health') {
    await handleAiHealth(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/profile') {
    await handleGetProfile(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/profile') {
    await handleProfile(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/product/resolve') {
    await handleProductResolve(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/product/verify') {
    await handleProductVerify(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/feedback') {
    await handleFeedback(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Compatibility service listening on http://localhost:${PORT}`);
});
