import type { PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6 py-12">{children}</main>;
}