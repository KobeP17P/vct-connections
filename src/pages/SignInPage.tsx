import { useState } from "react";
import { useAuth, useSignIn } from "@clerk/react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { isClerkConfigured } from "../auth/clerk";
import { getSafeInternalPath } from "../auth/redirect";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
      />
    </svg>
  );
}

function openGooglePopup(): Window | null {
  const width = 500;
  const height = 700;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open(
    "about:blank",
    "",
    `width=${width},height=${height},left=${left},top=${top}`,
  );
  if (popup) {
    popup.document.write(
      `<!doctype html><title>Google sign-in</title><body style="margin:0;background:#0f1923;color:#ece8e1;font:14px system-ui;display:grid;place-items:center;height:100vh">Connecting to Google…</body>`,
    );
    popup.document.close();
  }
  return popup;
}

function GoogleSignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [localError, setLocalError] = useState<string | null>(null);
  const nextPath = getSafeInternalPath(params.get("redirect"));

  if (isSignedIn) {
    return <Navigate to={nextPath} replace />;
  }

  async function handleGoogle() {
    if (!isLoaded || !signIn) {
      setLocalError("Sign-in is still loading. Try again in a moment.");
      return;
    }
    setLocalError(null);
    const popup = openGooglePopup();
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: nextPath,
        redirectCallbackUrl: "/sso-callback",
        popup: popup ?? undefined,
      });
      if (error) {
        popup?.close();
        setLocalError(error.message);
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const destination = decorateUrl(nextPath);
            if (destination.startsWith("http")) {
              window.location.assign(destination);
              return;
            }
            void navigate(destination, { replace: true });
          },
        });
      }
    } catch (error) {
      popup?.close();
      setLocalError(
        error instanceof Error ? error.message : "Google sign-in failed",
      );
    }
  }

  const clerkError = errors.global?.[0]?.message;
  const busy = !isLoaded || fetchStatus === "fetching";

  return (
    <div className="mx-auto max-w-[390px] text-center">
      <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
        Account
      </p>
      <h1 className="mt-1 font-display text-4xl tracking-wide text-comms-text">
        Sign in
      </h1>
      <p className="mt-2 font-body text-sm text-comms-muted">
        Continue with Google to join the ranks board and use the same account
        on another device. Puzzle progress still saves in this browser if you
        stay signed out.
      </p>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={busy}
        className="clip-angled mt-8 flex w-full items-center justify-center gap-3 bg-comms-tile px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-comms-text transition hover:brightness-110 disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Connecting…" : "Continue with Google"}
      </button>

      {localError || clerkError ? (
        <p className="mt-4 font-body text-xs text-comms-accent" role="alert">
          {localError ?? clerkError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-6 font-body text-xs font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-text"
      >
        Back
      </button>
    </div>
  );
}

export function SignInPage() {
  if (!isClerkConfigured()) {
    return <Navigate to="/" replace />;
  }
  return <GoogleSignIn />;
}
