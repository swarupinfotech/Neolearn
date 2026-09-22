import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium block mb-1.5", className)} {...props} />;
}

export const inputClass =
  "w-full h-10 px-3 rounded-lg border border-border bg-surface text-fg text-sm " +
  "placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputClass, "min-h-24 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted mt-1">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-rose-600 mt-1" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}