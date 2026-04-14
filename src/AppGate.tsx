import { useEffect, useState } from "react";
import App from "./App";
import { LoadingScreen } from "./pages/LoadingScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { SignupScreen } from "./pages/SignupScreen";

type Phase = "loading" | "login" | "signup" | "main";

const LOADING_MS = 2000;

export function AppGate() {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("login"), LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (phase === "loading") {
    return <LoadingScreen />;
  }
  if (phase === "login") {
    return (
      <LoginScreen
        onLogin={() => setPhase("main")}
        onGoSignup={() => setPhase("signup")}
      />
    );
  }
  if (phase === "signup") {
    return (
      <SignupScreen
        onBack={() => setPhase("login")}
        onSignedUp={() => setPhase("main")}
      />
    );
  }
  return <App />;
}
