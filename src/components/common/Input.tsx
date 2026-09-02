import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, error, hint, className = "", ...props }, ref) => (
  <div className="grid gap-1.5">
    <label className="text-sm font-medium text-slate-700" htmlFor={id}>{label}</label>
    <input id={id} ref={ref} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={`h-11 rounded-lg border bg-transparent px-3 font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${error ? "border-red-700" : "border-slate-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"} ${className}`} {...props} />
    {error ? <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p> : hint ? <p id={`${id}-hint`} className="text-sm text-slate-500">{hint}</p> : null}
  </div>
));
Input.displayName = "Input";