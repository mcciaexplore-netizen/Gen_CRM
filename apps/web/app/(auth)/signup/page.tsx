"use client";

import type { AuthResponse, SignupInput } from "@msme-crm/shared-types";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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

const initialForm: SignupInput = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: keyof SignupInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.replace("/setup");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.signup.title}</CardTitle>
        <CardDescription>{copy.signup.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Business name" id="businessName">
            <Input
              id="businessName"
              autoComplete="organization"
              autoFocus
              maxLength={100}
              required
              value={form.businessName}
              onChange={(event) => update("businessName", event.target.value)}
              placeholder="Sharma Services"
            />
          </Field>
          <Field label="Your name" id="ownerName">
            <Input
              id="ownerName"
              autoComplete="name"
              maxLength={100}
              required
              value={form.ownerName}
              onChange={(event) => update("ownerName", event.target.value)}
              placeholder="Aarav Sharma"
            />
          </Field>
          <Field label="Work email" id="email">
            <Input
              id="email"
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="you@business.com"
            />
          </Field>
          <Field label="Phone" id="phone">
            <Input
              id="phone"
              autoComplete="tel"
              inputMode="tel"
              minLength={7}
              maxLength={20}
              required
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="Password" id="password">
            <Input
              id="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>

          {error ? (
            <p
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create workspace
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            className="font-semibold text-primary hover:underline"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
