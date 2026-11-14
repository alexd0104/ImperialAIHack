// Every string shown to users lives here (English). Keys are namespaced per zone
// (`studio.*`, `house.*`) so parallel PRs merge without conflicts.
export const copy = {
  app: {
    name: "memorAI",
    tagline: "Real family photos, gently brought to life, to share with someone you love.",
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
