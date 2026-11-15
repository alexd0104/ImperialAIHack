import { copy } from "@/lib/copy";
import { LoginForm } from "./LoginForm";

// There is no Figma frame for sign-in; use the shared Studio tokens and components.
// Static on purpose: `?next=` is read by the form, so the page can be prerendered (cacheComponents).
export default function StudioLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-32 text-ink">{copy.studio.login.title}</h1>
      <p className="max-w-sm text-center text-16 text-ink/70">{copy.studio.login.intro}</p>
      <LoginForm />
    </main>
  );
}
