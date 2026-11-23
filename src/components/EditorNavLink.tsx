import { NavLink } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { isClerkConfigured } from "../auth/clerk";
import { canOpenEditorUi } from "../auth/editor";

const className = ({ isActive }: { isActive: boolean }) =>
  [
    "inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap px-1 font-body text-[10px] font-semibold uppercase tracking-wide transition sm:min-h-8 sm:px-2 sm:text-xs sm:tracking-[0.16em]",
    isActive ? "text-comms-accent" : "text-comms-muted hover:text-comms-text",
  ].join(" ");

export function EditorNavLink({
  to,
  children,
}: {
  to: string;
  children: string;
}) {
  if (!isClerkConfigured()) return null;
  return <EditorNavLinkInner to={to}>{children}</EditorNavLinkInner>;
}

function EditorNavLinkInner({
  to,
  children,
}: {
  to: string;
  children: string;
}) {
  const { isSignedIn, userId } = useAuth();
  if (!isSignedIn || !canOpenEditorUi(userId)) return null;
  return (
    <NavLink to={to} className={className}>
      {children}
    </NavLink>
  );
}
