
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCwulYPwsRb9J6hgnjom6NA_Ik4Ux3cFjE",
  authDomain: "mezi-svety.firebaseapp.com",
  projectId: "mezi-svety",
  storageBucket: "mezi-svety.firebasestorage.app",
  messagingSenderId: "261258067482",
  appId: "1:261258067482:web:5aae968f4d32e9a53d5ba3"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
