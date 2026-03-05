import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;
let connected = false;
let indexesReady = false;

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
  indexesReady = true;
}

export async function getMongoDb() {
  if (db) return db;

  const { uri, dbName } = getConfig();
  if (!uri) return null;

  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  }

  if (!connected) {
    await client.connect();
    connected = true;
  }

  db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}

export async function saveUserProfile(profile) {
  const database = await getMongoDb();
  if (!database) {
    return { stored: false, reason: 'mongodb_not_configured' };
  }

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

  return { stored: true };
}

export async function getUserProfileByUserId(userId) {
  const database = await getMongoDb();
  if (!database) {
    return null;
  }

  const normalized = String(userId ?? '').trim();
  if (!normalized) return null;

  return database.collection('user_profiles').findOne({ user_id: normalized });
}

export async function createUser({ username, usernameLower, passwordHash, passwordSalt }) {
  const database = await getMongoDb();
  if (!database) {
    return { created: false, reason: 'mongodb_not_configured' };
  }

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
    user: {
      id: String(result.insertedId),
      username,
    },
  };
}

export async function findUserByUsername(username) {
  const database = await getMongoDb();
  if (!database) return null;

  const usernameLower = String(username ?? '').trim().toLowerCase();
  if (!usernameLower) return null;

  return database.collection('users').findOne({ username_lower: usernameLower });
}

export async function createSession({ userId, username, token, ttlDays = 30 }) {
  const database = await getMongoDb();
  if (!database) {
    return { created: false, reason: 'mongodb_not_configured' };
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  await database.collection('sessions').insertOne({
    token,
    user_id: new ObjectId(userId),
    username,
    created_at: createdAt,
    expires_at: expiresAt,
  });

  return { created: true, expiresAt: expiresAt.toISOString() };
}

export async function findSessionWithUserByToken(token) {
  const database = await getMongoDb();
  if (!database) return null;

  const normalized = String(token ?? '').trim();
  if (!normalized) return null;

  const session = await database.collection('sessions').findOne({ token: normalized });
  if (!session) return null;

  const user = await database.collection('users').findOne({ _id: session.user_id });
  if (!user) return null;

  return { session, user };
}

export async function deleteSession(token) {
  const database = await getMongoDb();
  if (!database) return { deleted: 0 };

  const result = await database.collection('sessions').deleteOne({ token: String(token ?? '').trim() });
  return { deleted: result.deletedCount ?? 0 };
}
