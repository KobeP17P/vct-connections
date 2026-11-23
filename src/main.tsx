import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { App } from "./App";
import {
  clerkAppearance,
  getClerkPublishableKey,
} from "./auth/clerk";
import "./style.css";

const publishableKey = getClerkPublishableKey();

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl="/"
        signInUrl="/sign-in"
        signUpUrl="/sign-in/continue"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        appearance={clerkAppearance}
      >
        {app}
      </ClerkProvider>
    ) : (
      app
    )}
  </StrictMode>,
);
