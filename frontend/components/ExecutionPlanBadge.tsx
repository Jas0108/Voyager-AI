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
  supervisor: "text-purple-700 bg-purple-50 border-purple-200",
  planning: "text-teal-700 bg-teal-50 border-teal-200",
  discovery: "text-emerald-700 bg-emerald-50 border-emerald-200",
  budget: "text-amber-700 bg-amber-50 border-amber-200",
};

export default function ExecutionPlanBadge({ plan }: ExecutionPlanBadgeProps) {
  if (!plan || plan.length === 0) return null;

  const fullPlan = ["supervisor", ...plan];

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        Agent Workflow:
      </span>
      {fullPlan.map((agent, idx) => (
        <div key={`${agent}-${idx}`} className="flex items-center gap-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${AGENT_COLORS[agent] || "text-slate-600 bg-slate-100 border-slate-200"}`}
          >
            {AGENT_LABELS[agent] || agent}
          </span>
          {idx < fullPlan.length - 1 && (
            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
          )}
        </div>
      ))}
    </div>
  );
}

