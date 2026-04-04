import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  wrapperClassName?: string;
  size?: "default" | "compact";
};

export function NativeSelect({ children, className, wrapperClassName, size = "default", ...props }: NativeSelectProps) {
  const isCompact = size === "compact";

  return (
    <div className={`relative w-full ${wrapperClassName ?? ""}`}>
      <select
        {...props}
        className={`w-full min-w-0 appearance-none rounded-xl border border-border bg-background px-3 text-sm ${isCompact ? "py-2 pr-8" : "py-2 pr-10"} ${className ?? ""}`}
      >
        {children}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-foreground/45 ${isCompact ? "right-2.5 h-3.5 w-3.5" : "right-3 h-4 w-4"}`}
      />
    </div>
  );
}
