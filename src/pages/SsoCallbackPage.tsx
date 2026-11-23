import { HandleSSOCallback } from "@clerk/react";
import { Navigate, useNavigate } from "react-router-dom";
import { isClerkConfigured } from "../auth/clerk";

function goTo(navigate: ReturnType<typeof useNavigate>, url: string) {
  if (url.startsWith("http")) {
    window.location.assign(url);
    return;
  }
  void navigate(url, { replace: true });
}

export function SsoCallbackPage() {
  const navigate = useNavigate();

  if (!isClerkConfigured()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-[390px] py-16 text-center">
      <p className="font-body text-sm text-comms-muted">Finishing sign-in…</p>
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          goTo(navigate, decorateUrl("/"));
        }}
        navigateToSignIn={() => {
          void navigate("/sign-in", { replace: true });
        }}
        navigateToSignUp={() => {
          void navigate("/sign-in/continue", { replace: true });
        }}
      />
    </div>
  );
}
