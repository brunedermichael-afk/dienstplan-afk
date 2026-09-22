"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { devLogin } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sport Mayer
          </h1>
          <p className="mt-1 text-sm text-slate-500">Dienstplan</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
            Link verschickt! Schau in dein Postfach ({email}) und tipp auf den
            Link zum Einloggen.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vorname@sportmayer.at"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {status === "sending" ? "Sende Link…" : "Login-Link anfordern"}
            </button>
          </form>
        )}

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-2 text-center text-xs text-slate-400">
              Nur lokal (Dev): ohne E-Mail einloggen
            </p>
            <div className="flex gap-2">
              <form action={() => devLogin("employee")} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Als Mitarbeiter:in
                </button>
              </form>
              <form action={() => devLogin("admin")} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Als Admin
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
