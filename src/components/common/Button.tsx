import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles = variant === "primary"
    ? "bg-teal-700 text-white hover:bg-teal-800"
    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return <button className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${styles} ${className}`} {...props} />;
}