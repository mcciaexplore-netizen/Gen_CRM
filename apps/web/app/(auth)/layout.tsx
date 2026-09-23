import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <div className="flex justify-center mb-8">
          <Image
            priority
            src="/mccia-logo.png"
            alt="MCCIA"
            width={160}
            height={56}
            style={{ width: "auto", height: "auto" }}
          />
        </div>
        {children}
      </div>
    </main>
  );
}
