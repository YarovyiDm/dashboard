import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const krokyConfig = {
  apiKey: import.meta.env.VITE_KROKY_API_KEY,
  authDomain: import.meta.env.VITE_KROKY_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_KROKY_PROJECT_ID,
};

const existingKroky = getApps().find(a => a.name === 'kroky');
const krokyApp = existingKroky || initializeApp(krokyConfig, 'kroky');

export const krokyDb = getFirestore(krokyApp);
export const krokyAuth = getAuth(krokyApp);

const kmetaConfig = {
  apiKey: import.meta.env.VITE_KMETA_API_KEY,
  authDomain: import.meta.env.VITE_KMETA_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_KMETA_PROJECT_ID,
};

const existingKmeta = getApps().find(a => a.name === 'kmeta');
const kmetaApp = existingKmeta || initializeApp(kmetaConfig, 'kmeta');

export const kmetaDb = getFirestore(kmetaApp);
