import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Force account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async (allowedDomain?: string) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  try {
    if (isMobile) {
      // Use redirect for mobile to avoid popup blockers
      await signInWithRedirect(auth, googleProvider);
      return null; // Will redirect away
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // For testing purposes, we allow the user's email as an exception
    const testEmail = 'bulearning004@gmail.com';
    
    if (user.email !== testEmail) {
      if (allowedDomain && !user.email?.endsWith(allowedDomain)) {
        await signOut(auth);
        throw new Error(`กรุณาใช้บัญชี ${allowedDomain} ในการเข้าสู่ระบบส่วนนี้`);
      }
    }
    
    return user;
  } catch (error) {
    console.error('Auth Error:', error);
    throw error;
  }
};

export const handleRedirectResult = async (allowedDomain?: string) => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      const testEmail = 'bulearning004@gmail.com';
      if (user.email !== testEmail) {
        if (allowedDomain && !user.email?.endsWith(allowedDomain)) {
          await signOut(auth);
          throw new Error(`กรุณาใช้บัญชี ${allowedDomain} ในการเข้าสู่ระบบส่วนนี้`);
        }
      }
      return user;
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

export { onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc };
export type { User };
