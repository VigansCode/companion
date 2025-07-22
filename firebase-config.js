// firebase-config.js
// Add this to your project root

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBrkLBYOOD7XshgIltPKeWFPIb6BKUXO1U",
  authDomain: "companion-backrooms.firebaseapp.com",
  databaseURL: "https://companion-backrooms-default-rtdb.firebaseio.com",
  projectId: "companion-backrooms",
  storageBucket: "companion-backrooms.firebasestorage.app",
  messagingSenderId: "459598893293",
  appId: "1:459598893293:web:f021ba061e67a2de873ce4",
  measurementId: "G-SP8KBKJZ2N"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
