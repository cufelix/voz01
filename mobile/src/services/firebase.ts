import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';

// Firebase configuration - these should be in environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const firebaseAuth = auth();
const db = firestore();
const firebaseFunctions = functions();
const firebaseStorage = storage();

// Configure functions for different environments
if (__DEV__) {
  firebaseFunctions.useEmulator('localhost', 5001);
}

export { app, firebaseAuth, db, firebaseFunctions, firebaseStorage };

// Export common functions
export const createUserDocument = async (user: any, userData: any) => {
  try {
    await db.collection('users').doc(user.uid).set({
      ...userData,
      uid: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

export const updateUserDocument = async (uid: string, data: any) => {
  try {
    await db.collection('users').doc(uid).update({
      ...data,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};