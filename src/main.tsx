import React from "react";
import ReactDOM from "react-dom/client";
import { AppGate } from "./AppGate.tsx";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>,
);
