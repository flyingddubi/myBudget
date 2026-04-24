import { useEffect, useState } from "react";
import App from "./App";
import { AuthScreen } from "./pages/AuthScreen";
import { AppProvider, buildBudgetStorageKey } from "./context/AppContext";
import { useAuthContext } from "./context/AuthContext";
import { LoadingScreen } from "./pages/LoadingScreen";

type Phase = "loading" | "main";

const LOADING_MS = 2000;

export function AppGate() {
  const { user, loading } = useAuthContext();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("main"), LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (phase === "loading" || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppProvider storageKey={buildBudgetStorageKey(user.uid)}>
      <App />
    </AppProvider>
  );
}
