import { BrainCircuit, Database, FlaskConical, ScanSearch, Users } from "lucide-react";

const nodes = [
  { label: "Studies", icon: FlaskConical, position: "left-5 top-7" },
  { label: "Candidates", icon: Users, position: "right-5 top-7" },
  { label: "Evidence", icon: Database, position: "bottom-7 left-5" },
  { label: "Models", icon: BrainCircuit, position: "bottom-7 right-5" },
];

export function ResearchMap() {
  return (
    <div
      className="glass glass--react relative min-h-80 overflow-hidden p-5 sm:min-h-96"
      aria-label="Clinical research intelligence map"
    >
      <div
        className="absolute inset-[17%] rounded-full border border-primary/20 motion-morph"
        aria-hidden
      />
      <div
        className="absolute inset-[28%] rounded-full border border-primary/10"
        aria-hidden
      />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-sm">
        <ScanSearch className="size-4" aria-hidden />
        <span>Research action</span>
      </div>
      {nodes.map(({ label, icon: Icon, position }) => (
        <div
          key={label}
          className={`motion-lift absolute flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm ${position}`}
        >
          <Icon className="size-4" aria-hidden />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}