import { cn } from "@/lib/utils";

export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="ClinQSphereX"
      className={cn("size-7", className)}
    >
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="10" className="fill-primary" />
      <circle
        cx="16"
        cy="15.5"
        r="7.5"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="34 12"
      />
      <path
        d="M16 15.5 L23 22.5"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <Monogram />}
      <span className="font-display text-[1.05rem] font-semibold tracking-normal">
        ClinQSphereX
      </span>
    </span>
  );
}
