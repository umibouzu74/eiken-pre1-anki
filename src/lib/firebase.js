import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAGVLt6RYG2E4rXebNRJ39X3i3FP3d9uNk",
  authDomain: "eiken-pre1-anki.firebaseapp.com",
  projectId: "eiken-pre1-anki",
  storageBucket: "eiken-pre1-anki.firebasestorage.app",
  messagingSenderId: "377021494060",
  appId: "1:377021494060:web:3d60e2d19b9dba4ada3289"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
