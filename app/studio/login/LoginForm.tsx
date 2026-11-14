"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import { safeNextPath } from "@/lib/session";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
        router.refresh();
        return;
      }
      setError(
        response.status === 401 ? copy.studio.login.wrongPassword : copy.studio.login.genericError,
      );
    } catch {
      setError(copy.studio.login.genericError);
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <Label htmlFor="studio-password">{copy.studio.login.passwordLabel}</Label>
      <Input
        id="studio-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "studio-login-error" : undefined}
      />
      {error ? (
        <p id="studio-login-error" role="alert" className="text-14 text-ink">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting || password.length === 0}>
        {submitting ? copy.studio.login.submitting : copy.studio.login.submit}
      </Button>
    </form>
  );
}
