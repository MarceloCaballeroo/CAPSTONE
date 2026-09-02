import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
};

export function Button({ variant = "primary", isLoading = false, className = "", children, disabled, ...props }: ButtonProps) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border border-slate-300 bg-transparent text-slate-700 hover:border-teal-700 hover:text-teal-700",
    ghost: "text-teal-700 underline underline-offset-4 hover:text-teal-900",
  }[variant];

  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}