import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  hasSeenHowToPlay,
  HowToPlay,
  markHowToPlaySeen,
} from "./components/HowToPlay";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ArchivePage } from "./pages/ArchivePage";
import { CreatePage } from "./pages/CreatePage";
import { CustomPlayPage } from "./pages/CustomPlayPage";
import { HomePage } from "./pages/HomePage";
import { AccountPage } from "./pages/AccountPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { PuzzlePage } from "./pages/PuzzlePage";
import { SignInContinuePage } from "./pages/SignInContinuePage";
import { SignInPage } from "./pages/SignInPage";
import { SsoCallbackPage } from "./pages/SsoCallbackPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PuzzleCatalogProvider } from "./components/PuzzleCatalog";
import { UsernameGate } from "./components/UsernameGate";
import { DeskPage } from "./pages/DeskPage";

export function App() {
  const location = useLocation();
  const [howToOpen, setHowToOpen] = useState(false);
  const isAuthRoute =
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sso-callback");

  useEffect(() => {
    if (!hasSeenHowToPlay()) {
      setHowToOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthRoute) setHowToOpen(false);
  }, [isAuthRoute]);

  function closeHowToPlay() {
    markHowToPlaySeen();
    setHowToOpen(false);
  }

  return (
    <div className="min-h-screen bg-comms-bg px-3 pb-10 pt-4 sm:px-4">
      <UsernameGate>
      <SiteHeader onHowToPlay={() => setHowToOpen(true)} />

      <PuzzleCatalogProvider>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/desk" element={<DeskPage />} />
        <Route path="/ranks" element={<LeaderboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/play" element={<CustomPlayPage />} />
        <Route path="/puzzle/:id" element={<PuzzlePage />} />
        <Route path="/sign-in/continue" element={<SignInContinuePage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sso-callback/*" element={<SsoCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
      </PuzzleCatalogProvider>

      <SiteFooter />

      <HowToPlay open={howToOpen} onClose={closeHowToPlay} />
      </UsernameGate>
    </div>
  );
}
