import { useEffect, useState } from "react";
import App from "./App";
import { LoadingScreen } from "./pages/LoadingScreen";

type Phase = "loading" | "main";

const LOADING_MS = 2000;

export function AppGate() {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("main"), LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (phase === "loading") {
    return <LoadingScreen />;
  }
  return <App />;
}
