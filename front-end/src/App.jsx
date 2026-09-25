import { WallpaperProvider } from "./context/WallpaperContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "@clerk/react";
import PageLoader from "./components/PageLoader";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect, useState } from "react";

import { Toaster } from "react-hot-toast";

function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const [clerkLoadTimedOut, setClerkLoadTimedOut] = useState(false);

  // option 1
  // const { checkAuth, isCheckingAuth, clearAuth } = useAuthStore();

  // option 2 - better for performance
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const authError = useAuthStore((state) => state.authError);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) checkAuth();
    else clearAuth();
  }, [checkAuth, clearAuth, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      setClerkLoadTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setClerkLoadTimedOut(true), 15000);
    return () => window.clearTimeout(timeoutId);
  }, [isLoaded]);

  if (!isLoaded) {
    if (clerkLoadTimedOut) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
          <section className="max-w-lg text-center">
            <h1 className="text-xl font-semibold">Sign-in is taking too long</h1>
            <p className="mt-3 text-sm text-muted">
              Check that the deployment uses the correct Clerk publishable key and allows this
              domain, then reload the page.
            </p>
            <button
              className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </section>
        </main>
      );
    }

    return <PageLoader />;
  }

  if (isSignedIn && isCheckingAuth) return <PageLoader />;
  if (isSignedIn && authError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg text-center">
          <h1 className="text-xl font-semibold">Could not connect to chat</h1>
          <p className="mt-3 text-sm text-muted">{authError}</p>
          <button
            className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            onClick={checkAuth}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <ThemeProvider>
      <WallpaperProvider>
        <Routes>
          <Route path="/" element={isSignedIn ? <ChatPage /> : <Navigate to={"/auth"} replace />} />
          <Route
            path="/auth"
            element={!isSignedIn ? <AuthPage /> : <Navigate to={"/"} replace />}
          />
        </Routes>
        <Toaster />
      </WallpaperProvider>
    </ThemeProvider>
  );
}

export default App;