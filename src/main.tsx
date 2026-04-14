import React from "react";
import ReactDOM from "react-dom/client";
import { AppGate } from "./AppGate.tsx";
import { AppProvider } from "./context/AppContext";
import { initFirebaseAnalytics } from "./firebase/client";
import "./index.css";

void initFirebaseAnalytics().catch(() => undefined);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <AppGate />
    </AppProvider>
  </React.StrictMode>,
);
