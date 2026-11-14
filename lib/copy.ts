// Every string shown to users lives here (English). Keys are namespaced per zone
// (`studio.*`, `house.*`) so parallel PRs merge without conflicts.
export const copy = {
  app: {
    name: "memorAI",
    tagline: "Real family photos, gently brought to life, to share with someone you love.",
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
} as const;
