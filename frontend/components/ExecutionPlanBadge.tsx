import { ArrowRight } from "lucide-react";

interface ExecutionPlanBadgeProps {
  plan: string[];
}

const AGENT_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  planning: "Planning",
  discovery: "Discovery",
  budget: "Budget",
};

const AGENT_COLORS: Record<string, string> = {
  supervisor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  planning: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  discovery: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  budget: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function ExecutionPlanBadge({ plan }: ExecutionPlanBadgeProps) {
  if (!plan || plan.length === 0) return null;

  const fullPlan = ["supervisor", ...plan];

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
        Execution Plan:
      </span>
      {fullPlan.map((agent, idx) => (
        <div key={`${agent}-${idx}`} className="flex items-center gap-1">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${AGENT_COLORS[agent] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}
          >
            {AGENT_LABELS[agent] || agent}
          </span>
          {idx < fullPlan.length - 1 && (
            <ArrowRight className="w-2.5 h-2.5 text-[hsl(var(--muted-foreground))]" />
          )}
        </div>
      ))}
    </div>
  );
}
