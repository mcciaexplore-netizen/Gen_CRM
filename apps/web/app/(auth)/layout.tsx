import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-dvh px-4 py-8 sm:grid sm:place-items-center sm:py-12 bg-white"
    >
      <div className="mx-auto w-full max-w-md">
        {/* MCCIA Logo Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center py-4"
          >
            <Image
              src="/mccia-logo.png"
              alt="MCCIA – Mahratta Chamber of Commerce, Industries and Agriculture"
              width={200}
              height={70}
              priority
              style={{ width: "200px", height: "auto", objectFit: "contain" }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#0057A8", letterSpacing: "0.18em" }}>
              Mahratta Chamber of Commerce, Industries &amp; Agriculture
            </p>
            <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
              Member CRM Portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border-t-4 bg-white shadow-mccia"
          style={{ borderColor: "#0057A8" }}
        >
          <div className="rounded-xl p-1">{children}</div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs" style={{ color: "#94a3b8" }}>
          © {new Date().getFullYear()} MCCIA. All rights reserved.
        </p>
      </div>
    </main>
  );
}
