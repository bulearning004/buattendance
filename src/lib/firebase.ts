import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc, getDocFromServer, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Force account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const waitForAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 5000);
  });
};

export const signInWithGoogle = async (allowedDomains?: string | string[]) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  try {
    // Try popup first even on mobile, as it's more reliable for session persistence
    // if the browser doesn't block it (triggered by user click)
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return await validateUser(result.user, allowedDomains);
    } catch (popupError: any) {
      console.warn('Popup failed, falling back to redirect:', popupError.code);
      // If popup blocked or failed, and we are on mobile, try redirect
      if (isMobile && (
        popupError.code === 'auth/popup-blocked' || 
        popupError.code === 'auth/cancelled-popup-request' ||
        popupError.code === 'auth/popup-closed-by-user'
      )) {
        await signInWithRedirect(auth, googleProvider);
        return null; // Will redirect away
      }
      throw popupError;
    }
  } catch (error) {
    console.error('Auth Error:', error);
    throw error;
  }
};

async function validateUser(user: User, allowedDomains?: string | string[]) {
  const testEmail = 'bulearning004@gmail.com';
  if (user.email !== testEmail) {
    if (allowedDomains) {
      const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
      const isAllowed = domains.some(domain => user.email?.endsWith(domain));
      if (!isAllowed) {
        await signOut(auth);
        throw new Error(`กรุณาใช้บัญชี ${domains.join(' หรือ ')} ในการเข้าสู่ระบบส่วนนี้`);
      }
    }
  }
  return user;
}

export const handleRedirectResult = async (allowedDomains?: string | string[]) => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return await validateUser(result.user, allowedDomains);
    }
    return null;
  } catch (error) {
    console.error('Redirect Auth Error:', error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc, Timestamp, serverTimestamp, writeBatch };
export type { User };
