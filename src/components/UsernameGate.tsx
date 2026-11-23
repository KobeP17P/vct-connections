import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { SignOutButton, useAuth, useSession, useUser } from "@clerk/react";
import { useLocation } from "react-router-dom";
import { isClerkConfigured } from "../auth/clerk";
import {
  claimUsername,
  fetchOwnProfile,
  suggestedUsername,
  validateUsername,
} from "../lib/leaderboard";
import { createClerkSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

const ProfileNameContext = createContext<string | null>(null);

export function useProfileName(): string | null {
  return useContext(ProfileNameContext);
}

export function UsernameGate({ children }: { children: ReactNode }) {
  if (!isClerkConfigured() || !isSupabaseConfigured()) return children;
  return <UsernameGateInner>{children}</UsernameGateInner>;
}

function UsernameGateInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { session } = useSession();
  const { user } = useUser();
  const location = useLocation();
  const isAuthRoute =
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sso-callback");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    if (!session) return null;
    return createClerkSupabaseClient(() => session.getToken());
  }, [session]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !client || !userId) {
      setDisplayName(null);
      setNeedsUsername(false);
      setReady(true);
      return;
    }

    let active = true;
    setReady(false);
    void fetchOwnProfile(client, userId).then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
        setNeedsUsername(true);
        setReady(true);
        return;
      }
      const profile = result.profile;
      if (!profile || !profile.username_set) {
        setDisplayName(null);
        setNeedsUsername(true);
      } else {
        setDisplayName(profile.display_name);
        setNeedsUsername(false);
      }
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [client, isLoaded, isSignedIn, userId]);

  if (isAuthRoute) {
    return (
      <ProfileNameContext.Provider value={displayName}>
        {children}
      </ProfileNameContext.Provider>
    );
  }

  if (!ready) {
    return (
      <p className="mx-auto max-w-[390px] text-center font-body text-sm text-comms-muted">
        Loading…
      </p>
    );
  }

  if (needsUsername && userId && client) {
    return (
      <UsernameSetup
        userId={userId}
        suggestion={suggestedUsername({
          fullName: user?.fullName,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
          email: user?.primaryEmailAddress?.emailAddress,
        })}
        loadError={error}
        onClaimed={(name) => {
          setDisplayName(name);
          setNeedsUsername(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <ProfileNameContext.Provider value={displayName}>
      {children}
    </ProfileNameContext.Provider>
  );
}

function UsernameSetup({
  userId,
  suggestion,
  loadError,
  onClaimed,
}: {
  userId: string;
  suggestion: string;
  loadError: string | null;
  onClaimed: (name: string) => void;
}) {
  const { session } = useSession();
  const [value, setValue] = useState(suggestion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(loadError);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateUsername(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!session) {
      setError("Sign in again to save your username.");
      return;
    }
    setSaving(true);
    setError(null);
    const client = createClerkSupabaseClient(() => session.getToken());
    const message = client
      ? await claimUsername(client, userId, value)
      : "Supabase is not configured.";
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    onClaimed(value.trim());
  }

  return (
    <div className="mx-auto max-w-[390px] text-center">
      <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-comms-accent">
        Account
      </p>
      <h1 className="mt-1 font-display text-4xl tracking-wide text-comms-text">
        Choose a username
      </h1>
      <p className="mt-2 font-body text-sm text-comms-muted">
        This is the name that shows on the ranks board. You pick it once when
        you create your account.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-8">
        <label className="sr-only" htmlFor="comms-username">
          Username
        </label>
        <input
          id="comms-username"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="username"
          autoFocus
          maxLength={24}
          placeholder="your_tag"
          className="w-full border border-comms-text/20 bg-comms-tile px-4 py-3 font-body text-sm text-comms-text outline-none placeholder:text-comms-muted focus:border-comms-accent"
        />
        <p className="mt-2 font-body text-[11px] text-comms-muted">
          3–24 characters. Letters, numbers, and underscores.
        </p>
        {error ? (
          <p className="mt-3 font-body text-xs text-comms-accent" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="clip-angled mt-6 w-full bg-comms-accent px-5 py-3 font-body text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save username"}
        </button>
      </form>

      <SignOutButton redirectUrl="/">
        <button
          type="button"
          className="mt-6 font-body text-xs font-semibold uppercase tracking-wide text-comms-muted hover:text-comms-text"
        >
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
