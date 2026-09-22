"use client";

import type { AuthResponse, LoginInput } from "@msme-crm/shared-types";
import { ArrowRight, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { copy } from "@/lib/copy";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const destination =
        session.user.role === "STAFF" ? "/today" : "/dashboard";
      router.replace(
        session.business.onboardingCompletedAt ? destination : "/setup",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm({ email: "demo@mccia.in", password: "mccia@2024" });
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4 pt-6 text-center">
        <CardTitle
          className="text-2xl font-bold"
          style={{ color: "#003a62" }}
        >
          {copy.login.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {copy.login.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {/* Demo credentials banner */}
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #f0f6ff 0%, #e8f0fe 100%)",
            borderColor: "#003a62",
            borderLeftWidth: "4px",
          }}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#003a62" }} />
          <div className="flex-1 text-xs" style={{ color: "#003a62" }}>
            <p className="font-semibold">Demo Account</p>
            <p className="mt-0.5 opacity-80">
              Email: <span className="font-mono font-semibold">demo@mccia.in</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono font-semibold">mccia@2024</span>
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-1 font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "#003a62" }}
            >
              Click to auto-fill →
            </button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: "#003a62" }}>
              {t("email")}
            </Label>
            <Input
              id="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="you@business.com"
              className="border-2 focus-visible:ring-0"
              style={{ borderColor: "#d1dde8" }}
              onFocus={(e) => (e.target.style.borderColor = "#003a62")}
              onBlur={(e) => (e.target.style.borderColor = "#d1dde8")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: "#003a62" }}>
              {t("password")}
            </Label>
            <Input
              id="password"
              autoComplete="current-password"
              required
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Your password"
              className="border-2 focus-visible:ring-0"
              style={{ borderColor: "#d1dde8" }}
              onFocus={(e) => (e.target.style.borderColor = "#003a62")}
              onBlur={(e) => (e.target.style.borderColor = "#d1dde8")}
            />
          </div>

          {error ? (
            <p
              className="rounded-xl px-3 py-2.5 text-sm font-medium"
              role="alert"
              style={{ background: "#fff0f0", color: "#c0392b" }}
            >
              {error}
            </p>
          ) : null}

          <Button
            className="w-full font-semibold tracking-wide"
            disabled={loading}
            type="submit"
            style={{ background: "linear-gradient(135deg, #003a62 0%, #005a96 100%)", color: "#fff", border: "none" }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("signIn")}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("newAccount")}{" "}
          <Link
            className="font-semibold hover:underline"
            href="/signup"
            style={{ color: "#003a62" }}
          >
            {t("createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
