import { MongoClient, ObjectId } from 'mongodb';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

let client = null;
let db = null;
let connected = false;
let indexesReady = false;
let mongoDisabled = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackPath = path.join(__dirname, '../../data/local-auth-store.json');

function getConfig() {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim() || 'bc_patent_project';
  return { uri, dbName };
}

async function ensureIndexes(database) {
  if (indexesReady) return;
  await database.collection('users').createIndex({ username_lower: 1 }, { unique: true });
  await database.collection('sessions').createIndex({ token: 1 }, { unique: true });
  await database.collection('sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  await database.collection('assessment_history').createIndex({ user_id: 1, created_at: -1 });
  await database.collection('assessment_history').createIndex({ user_id: 1, assessment_id: 1 }, { unique: true });
  indexesReady = true;
}

export async function getMongoDb() {
  if (mongoDisabled) return null;
  if (db) return db;

  const { uri, dbName } = getConfig();
  if (!uri) return null;

  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 1000, connectTimeoutMS: 1000 });
  }

  try {
    if (!connected) {
      await client.connect();
      connected = true;
    }

    db = client.db(dbName);
    await ensureIndexes(db);
    return db;
  } catch {
    mongoDisabled = true;
    db = null;
    return null;
  }
}

async function readFallbackStore() {
  try {
    const raw = await fs.readFile(fallbackPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      profiles: parsed.profiles ?? [],
      histories: parsed.histories ?? [],
    };
  } catch {
    return { users: [], sessions: [], profiles: [], histories: [] };
  }
}

async function writeFallbackStore(store) {
  await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
  await fs.writeFile(fallbackPath, JSON.stringify(store, null, 2), 'utf8');
}

function mapFallbackUser(user) {
  if (!user) return null;
  return {
    _id: user.id,
    username: user.username,
    username_lower: user.username_lower,
    password_hash: user.password_hash,
    password_salt: user.password_salt,
  };
}

function mapFallbackProfile(profile) {
  if (!profile) return null;
  return {
    user_id: profile.user_id,
    skin_type: profile.skin_type,
    allergies: profile.allergies ?? [],
    conditions: profile.conditions ?? [],
    preferences: profile.preferences ?? [],
    updated_at: profile.updated_at,
  };
}

function mapHistoryRecord(entry) {
  if (!entry) return null;

  return {
    createdAt: entry.created_at,
    productName: entry.product_name,
    productSnapshot: entry.product_snapshot ?? {
      category: null,
      ingredients: [],
    },
    userProfileSnapshot: entry.user_profile_snapshot ?? null,
    assessment: entry.assessment ?? null,
    reportPayload: entry.report_payload ?? null,
    userDetails: {
      userId: entry.user_id,
      username: entry.username ?? null,
    },
  };
}

function toStoredHistoryEntry({ userId, username, entry }) {
  const assessmentId = String(entry?.assessment?.assessmentId ?? '').trim();
  if (!assessmentId) {
    throw new Error('assessment.assessmentId is required');
  }

  const createdAt = String(entry?.createdAt ?? '').trim() || new Date().toISOString();
  const updatedAt = new Date().toISOString();

  return {
    user_id: String(userId),
    username: username ? String(username) : null,
    assessment_id: assessmentId,
    created_at: createdAt,
    updated_at: updatedAt,
    product_name: String(entry?.productName ?? '').trim() || 'Unknown Product',
    product_snapshot: {
      category: entry?.productSnapshot?.category ?? null,
      ingredients: Array.isArray(entry?.productSnapshot?.ingredients) ? entry.productSnapshot.ingredients : [],
    },
    user_profile_snapshot: entry?.userProfileSnapshot
      ? {
          skinType: entry.userProfileSnapshot.skinType ?? null,
          allergies: Array.isArray(entry.userProfileSnapshot.allergies) ? entry.userProfileSnapshot.allergies : [],
          conditions: Array.isArray(entry.userProfileSnapshot.conditions) ? entry.userProfileSnapshot.conditions : [],
          preferences: Array.isArray(entry.userProfileSnapshot.preferences) ? entry.userProfileSnapshot.preferences : [],
        }
      : null,
    assessment: entry.assessment ?? null,
    report_payload: entry?.reportPayload ?? null,
  };
}

export async function saveUserProfile(profile) {
  try {
    const database = await getMongoDb();
    if (database) {
      await database.collection('user_profiles').updateOne(
        { user_id: profile.user_id },
        {
          $set: {
            ...profile,
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      return { stored: true, backend: 'mongodb' };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  const updated = {
    ...profile,
    updated_at: new Date().toISOString(),
  };
  const idx = store.profiles.findIndex((item) => item.user_id === profile.user_id);
  if (idx >= 0) store.profiles[idx] = updated;
  else store.profiles.push(updated);
  await writeFallbackStore(store);
  return { stored: true, backend: 'local_fallback' };
}

export async function getUserProfileByUserId(userId) {
  try {
    const database = await getMongoDb();
    if (database) {
      const normalized = String(userId ?? '').trim();
      if (!normalized) return null;
      return database.collection('user_profiles').findOne({ user_id: normalized });
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  return mapFallbackProfile(store.profiles.find((item) => item.user_id === String(userId ?? '').trim()));
}

export async function saveUserHistoryEntry({ userId, username, entry }) {
  const stored = toStoredHistoryEntry({ userId, username, entry });

  try {
    const database = await getMongoDb();
    if (database) {
      await database.collection('assessment_history').updateOne(
        {
          user_id: stored.user_id,
          assessment_id: stored.assessment_id,
        },
        {
          $set: stored,
        },
        { upsert: true }
      );
      return {
        stored: true,
        backend: 'mongodb',
        entry: mapHistoryRecord(stored),
      };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  const idx = store.histories.findIndex(
    (item) => item.user_id === stored.user_id && item.assessment_id === stored.assessment_id
  );
  if (idx >= 0) store.histories[idx] = stored;
  else store.histories.push(stored);
  await writeFallbackStore(store);

  return {
    stored: true,
    backend: 'local_fallback',
    entry: mapHistoryRecord(stored),
  };
}

export async function getUserHistoryByUserId(userId) {
  const normalized = String(userId ?? '').trim();
  if (!normalized) return [];

  try {
    const database = await getMongoDb();
    if (database) {
      const entries = await database
        .collection('assessment_history')
        .find({ user_id: normalized })
        .sort({ created_at: -1 })
        .toArray();
      return entries.map(mapHistoryRecord).filter(Boolean);
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  return store.histories
    .filter((item) => item.user_id === normalized)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(mapHistoryRecord)
    .filter(Boolean);
}

export async function deleteUserHistoryByUserId(userId) {
  const normalized = String(userId ?? '').trim();
  if (!normalized) return { deleted: 0, backend: 'local_fallback' };

  try {
    const database = await getMongoDb();
    if (database) {
      const result = await database.collection('assessment_history').deleteMany({ user_id: normalized });
      return { deleted: result.deletedCount ?? 0, backend: 'mongodb' };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  const before = store.histories.length;
  store.histories = store.histories.filter((item) => item.user_id !== normalized);
  await writeFallbackStore(store);
  return { deleted: before - store.histories.length, backend: 'local_fallback' };
}

export async function createUser({ username, usernameLower, passwordHash, passwordSalt }) {
  try {
    const database = await getMongoDb();
    if (database) {
      const now = new Date().toISOString();
      const result = await database.collection('users').insertOne({
        username,
        username_lower: usernameLower,
        password_hash: passwordHash,
        password_salt: passwordSalt,
        created_at: now,
        updated_at: now,
      });
      return {
        created: true,
        backend: 'mongodb',
        user: {
          id: String(result.insertedId),
          username,
        },
      };
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 11000) {
      throw error;
    }
  }

  const store = await readFallbackStore();
  if (store.users.some((item) => item.username_lower === usernameLower)) {
    const duplicate = new Error('Username already exists');
    duplicate.code = 11000;
    throw duplicate;
  }

  const user = {
    id: randomUUID(),
    username,
    username_lower: usernameLower,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.users.push(user);
  await writeFallbackStore(store);

  return {
    created: true,
    backend: 'local_fallback',
    user: {
      id: user.id,
      username: user.username,
    },
  };
}

export async function findUserByUsername(username) {
  const usernameLower = String(username ?? '').trim().toLowerCase();
  if (!usernameLower) return null;

  try {
    const database = await getMongoDb();
    if (database) {
      return database.collection('users').findOne({ username_lower: usernameLower });
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  return mapFallbackUser(store.users.find((item) => item.username_lower === usernameLower));
}

export async function createSession({ userId, username, token, ttlDays = 30 }) {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  try {
    const database = await getMongoDb();
    if (database) {
      const sessionUserId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
      await database.collection('sessions').insertOne({
        token,
        user_id: sessionUserId,
        username,
        created_at: createdAt,
        expires_at: expiresAt,
      });
      return { created: true, backend: 'mongodb', expiresAt: expiresAt.toISOString() };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  store.sessions = store.sessions.filter((item) => item.expires_at > new Date().toISOString());
  store.sessions.push({
    token,
    user_id: String(userId),
    username,
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  await writeFallbackStore(store);
  return { created: true, backend: 'local_fallback', expiresAt: expiresAt.toISOString() };
}

export async function findSessionWithUserByToken(token) {
  const normalized = String(token ?? '').trim();
  if (!normalized) return null;

  try {
    const database = await getMongoDb();
    if (database) {
      const session = await database.collection('sessions').findOne({ token: normalized });
      if (!session) return null;
      const userQuery = typeof session.user_id === 'string' ? { _id: session.user_id } : { _id: session.user_id };
      const user = await database.collection('users').findOne(userQuery);
      if (!user) return null;
      return { session, user };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  const nowIso = new Date().toISOString();
  const session = store.sessions.find((item) => item.token === normalized && item.expires_at > nowIso);
  if (!session) return null;
  const user = store.users.find((item) => item.id === session.user_id);
  if (!user) return null;
  return { session, user: mapFallbackUser(user) };
}

export async function deleteSession(token) {
  const normalized = String(token ?? '').trim();

  try {
    const database = await getMongoDb();
    if (database) {
      const result = await database.collection('sessions').deleteOne({ token: normalized });
      return { deleted: result.deletedCount ?? 0, backend: 'mongodb' };
    }
  } catch {
    // fall through to local store
  }

  const store = await readFallbackStore();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((item) => item.token !== normalized);
  await writeFallbackStore(store);
  return { deleted: before - store.sessions.length, backend: 'local_fallback' };
}
