import { ClerkLoaded, Show, useUser } from "@clerk/react";
import { Link, NavLink } from "react-router-dom";
import { isClerkConfigured } from "../auth/clerk";
import { useProfileName } from "./UsernameGate";

export function AuthControls() {
  if (!isClerkConfigured()) return null;

  return (
    <ClerkLoaded>
      <Show when="signed-out">
        <Link
          to="/sign-in"
          className="inline-flex min-h-10 items-center whitespace-nowrap px-1 font-body text-[10px] font-semibold uppercase tracking-wide text-comms-muted transition hover:text-comms-text sm:min-h-8 sm:px-2 sm:text-xs sm:tracking-[0.16em]"
        >
          Sign in
        </Link>
      </Show>
      <Show when="signed-in">
        <SignedInChip />
      </Show>
    </ClerkLoaded>
  );
}

function SignedInChip() {
  const { user } = useUser();
  const profileName = useProfileName();
  const label = profileName || user?.firstName || user?.username || "Account";

  return (
    <NavLink
      to="/account"
      title="Your ranks and stats"
      className={({ isActive }) =>
        [
          "inline-flex min-h-10 max-w-[6.5rem] items-center truncate whitespace-nowrap px-1 font-body text-[10px] font-semibold uppercase tracking-wide transition sm:min-h-8 sm:max-w-[9rem] sm:px-2 sm:text-xs sm:tracking-[0.16em]",
          isActive ? "text-comms-accent" : "text-comms-muted hover:text-comms-text",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
