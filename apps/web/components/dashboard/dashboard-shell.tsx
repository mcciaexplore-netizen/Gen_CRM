"use client";

import type { AuthResponse, UserRole } from "@msme-crm/shared-types";
import {
  ContactRound,
  Gauge,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Megaphone,
  PanelsTopLeft,
  ReceiptIndianRupee,
  ShieldCheck,
  X,
  Building2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { key: "home",       icon: Gauge,               href: "/dashboard", roles: ["OWNER", "ACCOUNTANT"] },
  { key: "inbox",      icon: MessageCircle,        href: "/inbox",     roles: ["OWNER", "STAFF"] },
  { key: "contacts",   icon: ContactRound,         href: "/contacts",  roles: ["OWNER", "STAFF"] },
  { key: "broadcasts", icon: Megaphone,            href: "/broadcasts",roles: ["OWNER"] },
  { key: "pipeline",   icon: PanelsTopLeft,        href: "/pipeline",  roles: ["OWNER", "STAFF"] },
  { key: "today",      icon: ListChecks,           href: "/today",     roles: ["OWNER", "STAFF"] },
  { key: "billing",    icon: ReceiptIndianRupee,   href: "/invoices",  roles: ["OWNER", "ACCOUNTANT"] },
  { key: "audit",      icon: ShieldCheck,          href: "/audit",     roles: ["OWNER"] },
] as const;

type Session = Pick<AuthResponse, "user" | "business">;

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Navigation");
  const common = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    apiFetch<Session>("/auth/me")
      .then((value) => {
        if (!value.business.onboardingCompletedAt) router.replace("/setup");
        else {
          const allowed = isRouteAllowed(pathname, value.user.role);
          if (!allowed) router.replace(defaultRoute(value.user.role));
          else setSession(value);
        }
      })
      .catch(() => router.replace("/login"));
  }, [pathname, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" }, false).catch(
      () => undefined,
    );
    router.replace("/login");
  }

  if (!session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white" aria-label={common("loading")}>
        <div className="flex flex-col items-center gap-4">
          <div className="p-4">
            <Image priority src="/mccia-logo.png" alt="MCCIA" width={160} height={56} style={{ width: "auto", height: "auto" }} />
          </div>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0057A8" }} />
        </div>
      </main>
    );
  }

  const visibleNavigation = navigation.filter((item) =>
    (item.roles as readonly UserRole[]).includes(session.user.role),
  );
  const mobileNavigation = visibleNavigation.slice(0, 5);
  const sectionName = pathname.startsWith("/contacts")
    ? t("contacts")
    : pathname.startsWith("/inbox")
      ? t("teamInbox")
      : pathname.startsWith("/pipeline")
        ? t("salesPipeline")
        : pathname.startsWith("/today")
          ? t("tasks")
          : pathname.startsWith("/invoices")
            ? t("billingInvoices")
            : pathname.startsWith("/audit")
              ? t("auditActivity")
              : t("overview");

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-64">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-white px-3 py-5 lg:flex shadow-sm"
      >
        {/* Logo */}
        <Link href="/dashboard" className="mx-1 mb-6 block">
          <div className="flex items-center gap-3 px-2 py-2.5">
            <div className="p-1">
              <Image priority src="/mccia-logo.png" alt="MCCIA" width={140} height={49} style={{ width: "auto", height: "auto" }} />
            </div>
          </div>
        </Link>

        {/* Nav divider label */}
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#00A651" }}>
          Navigation
        </p>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5" aria-label="Main navigation">
          {visibleNavigation.map((item) => (
            <DesktopNavItem
              key={item.key}
              item={item}
              label={t(item.key)}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        {/* User info card */}
        <div
          className="mx-1 mt-4 rounded-xl p-3 border shadow-sm bg-slate-50"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #00A651 0%, #00c462 100%)" }}
            >
              {session.user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold" style={{ color: "#003a62" }}>{session.business.name}</p>
              <p className="truncate text-[10px] text-slate-500">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            {common("signOut")}
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay menu ──────────────────────────────────────────── */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="h-full w-[82%] max-w-xs p-4 shadow-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="px-2 py-1.5">
                <Image priority src="/mccia-logo.png" alt="MCCIA" width={120} height={42} style={{ width: "auto", height: "auto" }} />
              </div>
              <Button aria-label="Close menu" onClick={() => setMenuOpen(false)} size="icon" variant="ghost">
                <X className="h-5 w-5" style={{ color: "#0057A8" }} />
              </Button>
            </div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#00A651" }}>Navigation</p>
            <nav className="space-y-0.5" aria-label="Menu navigation">
              {visibleNavigation.map((item) => (
                <DesktopNavItem key={item.key} item={item} label={t(item.key)} active={isActive(pathname, item.href)} />
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* ── Top header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6"
        style={{
          background: "linear-gradient(90deg, #ffffff 0%, #f5f9ff 100%)",
          borderBottom: "2px solid #0057A8",
          boxShadow: "0 2px 12px rgba(0,57,168,0.08)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open menu"
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu className="h-5 w-5" style={{ color: "#0057A8" }} />
          </Button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="lg:hidden">
            <Image priority src="/mccia-logo.png" alt="MCCIA" width={70} height={25} style={{ width: "auto", height: "auto" }} />
          </Link>

          {/* Breadcrumb (desktop) */}
          <div className="hidden min-w-0 lg:block">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" style={{ color: "#0057A8" }} />
              <p className="truncate text-sm font-bold" style={{ color: "#003a62" }}>
                {session.business.name}
              </p>
              <span className="text-slate-300">/</span>
              <p className="truncate text-sm font-medium text-slate-500">{sectionName}</p>
            </div>
          </div>

          {/* Mobile: section name */}
          <div className="min-w-0 lg:hidden">
            <p className="truncate text-sm font-semibold" style={{ color: "#003a62" }}>{sectionName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-mccia-sm"
            style={{ background: "linear-gradient(135deg, #0057A8 0%, #00A651 100%)" }}
            title={session.user.name}
          >
            {session.user.name.charAt(0).toUpperCase()}
          </span>
          <Button
            aria-label={common("signOut")}
            onClick={logout}
            size="icon"
            variant="ghost"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" style={{ color: "#0057A8" }} />
          </Button>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:pb-6">
        {children}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex border-t bg-white px-2 pt-2 lg:hidden"
        style={{ borderTopColor: "#0057A8", borderTopWidth: "2px" }}
        aria-label="Mobile navigation"
      >
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-colors"
              style={
                active
                  ? { color: "#0057A8", background: "rgba(0,87,168,0.08)" }
                  : { color: "#94a3b8" }
              }
            >
              <Icon className="h-5 w-5" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function DesktopNavItem({
  active,
  item,
  label,
}: {
  active: boolean;
  item: (typeof navigation)[number];
  label: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150",
        active
          ? "text-[#003a62]"
          : "text-slate-500 hover:text-[#003a62] hover:bg-slate-50",
      )}
      style={
        active
          ? {
              background: "linear-gradient(90deg, rgba(0,166,81,0.25) 0%, rgba(0,166,81,0.10) 100%)",
              borderLeft: "3px solid #00A651",
            }
          : { borderLeft: "3px solid transparent" }
      }
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: active ? "#00A651" : undefined }}
      />
      {label}
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "#00A651" }} />
      )}
    </Link>
  );
}

function defaultRoute(role: UserRole) {
  if (role === "STAFF") return "/today";
  return "/dashboard";
}

function isRouteAllowed(pathname: string, role: UserRole) {
  if (
    (pathname.startsWith("/inbox/settings") ||
      pathname.startsWith("/inbox/channels") ||
      pathname.startsWith("/pipeline/stages")) &&
    role !== "OWNER"
  ) {
    return false;
  }
  return navigation.some(
    (item) =>
      isActive(pathname, item.href) &&
      (item.roles as readonly UserRole[]).includes(role),
  );
}
