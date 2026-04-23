import React from "react";
import ReactDOM from "react-dom/client";
import { AppGate } from "./AppGate.tsx";
import { AppProvider } from "./context/AppContext";
import { I18nProvider } from "./i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <AppProvider>
        <AppGate />
      </AppProvider>
    </I18nProvider>
  </React.StrictMode>,
);
