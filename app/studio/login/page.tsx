import { copy } from "@/lib/copy";
import { LoginForm } from "./LoginForm";

// Minimal layout until the Studio tokens and components land (F5); no Figma frame for sign-in.
// Static on purpose: `?next=` is read by the form, so the page can be prerendered (cacheComponents).
export default function StudioLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">{copy.studio.login.title}</h1>
      <p className="max-w-sm text-center">{copy.studio.login.intro}</p>
      <LoginForm />
    </main>
  );
}
