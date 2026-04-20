import { cn } from "../../lib/utils";

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    status?: 'healthy' | 'warning' | 'critical';
    icon?: React.ReactNode;
    className?: string;
}

export function MetricCard({
    title,
    value,
    subValue,
    trend,
    status = 'healthy',
    icon,
    className
}: MetricCardProps) {
    const statusColors = {
        healthy: "text-emerald-500 dark:text-emerald-400 drop-shadow-sm",
        warning: "text-amber-500 dark:text-amber-400 drop-shadow-sm",
        critical: "text-rose-500 dark:text-rose-400 drop-shadow-sm"
    };

    const statusBorder = {
        healthy: "border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        warning: "border-amber-500/50 hover:border-amber-400 bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.2)]",
        critical: "border-rose-500/70 hover:border-rose-400 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]",
    };

    return (
        <div className={cn("relative overflow-hidden rounded-2xl border bg-slate-800/40 backdrop-blur-2xl text-slate-100 transition-all duration-300 hover:-translate-y-2 flex flex-col p-6 group", statusBorder[status], className)}>
            {/* Subtle Gradient Glow inside the card */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
                <h3 className="tracking-tight text-sm font-medium text-slate-400">{title}</h3>
                {icon && <div className="text-slate-400">{icon}</div>}
            </div>
            <div className="flex flex-col gap-1 z-10">
                <div className={cn("text-3xl font-bold font-mono tracking-tighter", statusColors[status])}>
                    {value}
                </div>
                {(subValue || trend) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-1">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}
