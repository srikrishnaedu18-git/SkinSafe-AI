import { deleteUserHistoryByUserId, getUserHistoryByUserId, saveUserHistoryEntry } from '../db/mongo.js';
import { getAuthUserFromRequest } from './auth.js';

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

export async function handleGetHistory(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const history = await getUserHistoryByUserId(auth.userId);
    sendJson(res, 200, {
      user: {
        id: auth.userId,
        username: auth.username,
      },
      history,
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'History fetch failed' });
  }
}

export async function handleSaveHistory(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const body = await readJson(req);
    if (!body?.entry || typeof body.entry !== 'object') {
      throw new Error('entry is required');
    }

    const saved = await saveUserHistoryEntry({
      userId: auth.userId,
      username: auth.username,
      entry: body.entry,
    });

    sendJson(res, 200, {
      stored: saved.stored,
      storage: {
        backend: saved.backend,
      },
      entry: saved.entry,
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'History save failed' });
  }
}

export async function handleClearHistory(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const result = await deleteUserHistoryByUserId(auth.userId);
    sendJson(res, 200, {
      deleted: result.deleted,
      storage: {
        backend: result.backend,
      },
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'History clear failed' });
  }
}
