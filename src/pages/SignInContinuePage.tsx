import { SignUp } from "@clerk/react";
import { Navigate } from "react-router-dom";
import { isClerkConfigured } from "../auth/clerk";

export function SignInContinuePage() {
  if (!isClerkConfigured()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-[390px]">
      <p className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
        Account
      </p>
      <h1 className="mb-6 text-center font-display text-4xl tracking-wide text-comms-text">
        Finish sign-in
      </h1>
      <SignUp
        routing="path"
        path="/sign-in/continue"
        fallbackRedirectUrl="/"
        signInUrl="/sign-in"
      />
    </div>
  );
}
