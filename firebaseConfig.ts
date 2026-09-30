import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB0THPXfY9qe0sf-ASJ3pm0y1zMRjmlJJE",
  authDomain: "myfc-df461.firebaseapp.com",
  projectId: "myfc-df461",
  storageBucket: "myfc-df461.firebasestorage.app",
  messagingSenderId: "537623015737",
  appId: "1:537623015737:web:30feb993c75832a31cb8e8",
  measurementId: "G-D6DL0BRK3Y"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();