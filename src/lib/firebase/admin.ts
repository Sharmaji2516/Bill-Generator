import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

export function isFirebaseAdminConfigured(): boolean {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  return Boolean(projectId && clientEmail && privateKey);
}

export function getFirebaseAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    if (!getApps().length) {
      cachedApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      cachedApp = getApps()[0];
    }
    cachedDb = getFirestore(cachedApp);
    return cachedDb;
  } catch (err) {
    console.error('[FirebaseAdmin] Initialization failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

