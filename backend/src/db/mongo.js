import { MongoClient } from 'mongodb';

let client = null;
let db = null;
let connected = false;

function getConfig() {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim() || 'bc_patent_project';
  return { uri, dbName };
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
