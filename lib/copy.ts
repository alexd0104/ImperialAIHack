// Every string shown to users lives here (English). Keys are namespaced per zone
// (`studio.*`, `house.*`) so parallel PRs merge without conflicts.
export const copy = {
  app: {
    name: "memorAI",
    tagline: "Real family photos, gently brought to life, to share with someone you love.",
  },
  // Messages carried in API error envelopes; the Studio may show them as they are.
  auth: {
    signInRequired: "Please sign in.",
    wrongPassword: "That password is not right.",
    notConfigured: "Studio sign-in is not configured.",
  },
  studio: {
    login: {
      title: "Family Studio",
      intro: "Enter the family password to create and share Memories.",
      passwordLabel: "Password",
      submit: "Sign in",
      submitting: "Signing in…",
      wrongPassword: "That password is not right. Please try again.",
      genericError: "Something went wrong. Please try again.",
    },
  },
  // Accessible names for shared components in components/ui (screen readers only).
  ui: {
    heartButton: "Send love",
    videoBadge: "Video",
    stepDone: "done",
    stepCurrent: "current step",
    memoryProgress: "Memory progress",
  },
} as const;
