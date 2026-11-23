import { Link, NavLink } from "react-router-dom";
import { AuthControls } from "./AuthControls";
import { EditorNavLink } from "./EditorNavLink";

interface SiteHeaderProps {
  onHowToPlay: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap px-1 font-body text-[10px] font-semibold uppercase tracking-wide transition sm:min-h-8 sm:px-2 sm:text-xs sm:tracking-[0.16em]",
    isActive ? "text-comms-accent" : "text-comms-muted hover:text-comms-text",
  ].join(" ");

const actionClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap px-1 font-body text-[10px] font-semibold uppercase tracking-wide text-comms-muted transition hover:text-comms-text sm:min-h-8 sm:px-2 sm:text-xs sm:tracking-[0.16em]";

export function SiteHeader({ onHowToPlay }: SiteHeaderProps) {
  return (
    <nav className="relative z-[60] mx-auto mb-5 w-full bg-comms-bg">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-2">
        <Link
          to="/"
          className="justify-self-start whitespace-nowrap font-display text-[13px] tracking-wide text-comms-text sm:text-2xl"
        >
          VCT COMMS
        </Link>

        <div className="flex items-center justify-center gap-1 sm:gap-4">
          <NavLink to="/" end className={linkClass}>
            Today
          </NavLink>
          <button type="button" onClick={onHowToPlay} className={actionClass}>
            Help
          </button>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-3">
          <EditorNavLink to="/desk">Desk</EditorNavLink>
          <NavLink to="/ranks" className={linkClass}>
            Ranks
          </NavLink>
          <NavLink to="/archive" className={linkClass}>
            Archive
          </NavLink>
          <EditorNavLink to="/create">Create</EditorNavLink>
          <AuthControls />
        </div>
      </div>
    </nav>
  );
}
