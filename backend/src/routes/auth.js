import {
  createSession,
  createUser,
  deleteSession,
  findSessionWithUserByToken,
  findUserByUsername,
} from '../db/mongo.js';
import {
  createSessionToken,
  extractBearerToken,
  hashPassword,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '../auth/credentials.js';

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function toAuthResponse(user, token, expiresAt, storageBackend = 'mongodb') {
  return {
    token,
    expiresAt,
    user: {
      id: String(user.id ?? user._id),
      username: user.username,
    },
    storage: {
      backend: storageBackend,
    },
  };
}

export async function getAuthUserFromRequest(req) {
  const token = extractBearerToken(req);
  if (!token) return null;

  const result = await findSessionWithUserByToken(token);
  if (!result?.user) return null;

  return {
    token,
    userId: String(result.user._id),
    username: result.user.username,
  };
}

export async function handleRegister(req, res) {
  try {
    const body = await readJson(req);
    const username = validateUsername(body.username);
    const password = validatePassword(body.password);
    const usernameLower = username.toLowerCase();

    const existing = await findUserByUsername(username);
    if (existing) {
      sendJson(res, 409, { error: 'Username already exists' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const created = await createUser({
      username,
      usernameLower,
      passwordHash: hash,
      passwordSalt: salt,
    });

    if (!created.created || !created.user) {
      throw new Error(created.reason ?? 'Could not create user');
    }

    const token = createSessionToken();
    const session = await createSession({
      userId: created.user.id,
      username,
      token,
    });

    sendJson(res, 201, toAuthResponse(created.user, token, session.expiresAt, session.backend ?? created.backend ?? 'mongodb'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 11000) {
      sendJson(res, 409, { error: 'Username already exists' });
      return;
    }
    const message = error instanceof Error ? error.message : 'Register failed';
    sendJson(res, 400, { error: message });
  }
}

export async function handleLogin(req, res) {
  try {
    const body = await readJson(req);
    const username = validateUsername(body.username);
    const password = validatePassword(body.password);

    const user = await findUserByUsername(username);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid username or password' });
      return;
    }

    const valid = verifyPassword(password, user.password_salt, user.password_hash);
    if (!valid) {
      sendJson(res, 401, { error: 'Invalid username or password' });
      return;
    }

    const token = createSessionToken();
    const session = await createSession({
      userId: String(user._id),
      username: user.username,
      token,
    });

    sendJson(res, 200, toAuthResponse(user, token, session.expiresAt, session.backend ?? 'mongodb'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    sendJson(res, 400, { error: message });
  }
}

export async function handleMe(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    sendJson(res, 200, {
      user: {
        id: auth.userId,
        username: auth.username,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth check failed';
    sendJson(res, 400, { error: message });
  }
}

export async function handleLogout(req, res) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      sendJson(res, 200, { success: true });
      return;
    }

    await deleteSession(token);
    sendJson(res, 200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    sendJson(res, 400, { error: message });
  }
}
