export function getClerkPublishableKey(): string | undefined {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}

export function isClerkConfigured(): boolean {
  return Boolean(getClerkPublishableKey());
}

export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff4655",
    colorBackground: "#1f2731",
    colorText: "#ece8e1",
    colorNeutral: "#8b939b",
    colorInputBackground: "#0f1923",
    colorInputText: "#ece8e1",
    borderRadius: "2px",
  },
} as const;
