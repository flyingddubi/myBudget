import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbBxFfuTGAQyZv9xezQRaR4gxWay1_n-o",
  authDomain: "flyingcompany-mybuget.firebaseapp.com",
  projectId: "flyingcompany-mybuget",
  storageBucket: "flyingcompany-mybuget.firebasestorage.app",
  messagingSenderId: "804987318749",
  appId: "1:804987318749:web:4876011183068dda224634",
  measurementId: "G-EF1SCTR3LV",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export { firebaseConfig };
