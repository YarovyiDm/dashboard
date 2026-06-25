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

const urokConfig = {
  apiKey: import.meta.env.VITE_UROK_API_KEY,
  authDomain: import.meta.env.VITE_UROK_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_UROK_PROJECT_ID,
};

const existingUrok = getApps().find(a => a.name === 'urok');
const urokApp = existingUrok || initializeApp(urokConfig, 'urok');

export const urokDb = getFirestore(urokApp);
