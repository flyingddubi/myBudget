import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBbBxFfuTGAQyZv9xezQRaR4gxWay1_n-o",
  authDomain: "flyingcompany-mybuget.firebaseapp.com",
  projectId: "flyingcompany-mybuget",
  storageBucket: "flyingcompany-mybuget.firebasestorage.app",
  messagingSenderId: "804987318749",
  appId: "1:804987318749:web:4876011183068dda224634",
  measurementId: "G-EF1SCTR3LV",
};

const app: FirebaseApp = initializeApp(firebaseConfig);
console.log("Firebase app", app);

let analytics: Analytics | null = null;
isSupported()
  .then((ok) => {
    if (ok) {
      analytics = getAnalytics(app);
      console.log("Analytics ready", analytics);
    } else {
      console.log("Analytics not supported in this environment");
    }
  })
  .catch(() => {
    // Analytics not available (e.g. some embedded browsers)
  });

export { app, analytics, firebaseConfig };
