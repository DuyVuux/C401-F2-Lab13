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
        healthy: "text-green-500",
        warning: "text-amber-500",
        critical: "text-red-500 dark:text-red-400"
    };

    const statusBorder = {
        healthy: "border-border",
        warning: "border-amber-500/50",
        critical: "border-red-500/50",
    }

    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6", statusBorder[status], className)}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
            <div className="flex flex-col gap-1">
                <div className={cn("text-2xl font-bold font-mono tracking-tighter", statusColors[status])}>
                    {value}
                </div>
                {(subValue || trend) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}
