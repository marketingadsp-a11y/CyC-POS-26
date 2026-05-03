import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// CyC POS 26 Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8ziSBDKGwp01bKULvqXvZIHK12uF9mb8",
  authDomain: "cyc-pos-26.firebaseapp.com",
  projectId: "cyc-pos-26",
  storageBucket: "cyc-pos-26.firebasestorage.app",
  messagingSenderId: "766282500593",
  appId: "1:766282500593:web:971ade41b69ce27e219c50",
  measurementId: "G-GRRHQLJX1W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;