import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAQtMPqZE0A2XMM7bwikMW1EMlmDOdNip8",
  authDomain: "tiembanhcucquy-75fe1.firebaseapp.com",
  projectId: "tiembanhcucquy-75fe1",
  storageBucket: "tiembanhcucquy-75fe1.firebasestorage.app",
  messagingSenderId: "744823161157",
  appId: "1:744823161157:web:695e5dbe4cca0de719fe2c",
  measurementId: "G-6202LFPC63"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);