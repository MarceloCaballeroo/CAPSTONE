import type { PropsWithChildren } from "react";

export function Alert({ variant = "danger", children }: PropsWithChildren<{ variant?: "danger" | "success" }>) {
  const styles = variant === "danger" ? "border-red-700/40 bg-red-50 text-red-800" : "border-teal-700/40 bg-teal-50 text-teal-900";
  return <p role="alert" className={`border-l-2 px-4 py-3 text-sm ${styles}`}>{children}</p>;
}