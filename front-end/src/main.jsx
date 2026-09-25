import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    ) : (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg text-center">
          <h1 className="text-xl font-semibold">Sign-in is not configured</h1>
          <p className="mt-3 text-sm text-muted">
            Set VITE_CLERK_PUBLISHABLE_KEY in the deployment environment and rebuild the app.
          </p>
        </section>
      </main>
    )}
  </StrictMode>,
);