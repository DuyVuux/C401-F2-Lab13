import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IncidentManagerProps {
    incidents: Record<string, boolean>;
}

export function IncidentManager({ incidents }: IncidentManagerProps) {
    const queryClient = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: async ({ name, enable }: { name: string, enable: boolean }) => {
            // Forcing POST /incidents/{name}/{action}
            await api.toggleIncident(name, enable);
        },
        onSuccess: () => {
            // Invalidate health and metrics to ensure fresh fetch
            queryClient.invalidateQueries({ queryKey: ['health'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
        }
    });

    const incidentDefinitions = [
        { key: 'rag_slow', label: 'Simulate RAG Latency', icon: <Loader2 className="w-4 h-4" /> },
        { key: 'tool_fail', label: 'Simulate Tool Failures', icon: <ShieldAlert className="w-4 h-4" /> },
        { key: 'cost_spike', label: 'Spike Token Cost', icon: <Zap className="w-4 h-4" /> },
    ];

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Incident Control Panel</h2>
                    <p className="text-sm text-muted-foreground font-mono mt-1">POST /incidents/&#123;name&#125;</p>
                </div>
            </div>

            <div className="flex flex-col space-y-4">
                {incidentDefinitions.map((incident) => {
                    const isActive = incidents?.[incident.key] || false;
                    const isPending = toggleMutation.isPending && toggleMutation.variables?.name === incident.key;

                    return (
                        <div key={incident.key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                            <div className="flex items-center space-x-3">
                                <div className={cn("p-2 rounded-full", isActive ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground")}>
                                    {incident.icon}
                                </div>
                                <span className="font-medium text-sm">{incident.label}</span>
                            </div>
                            <button
                                onClick={() => toggleMutation.mutate({ name: incident.key, enable: !isActive })}
                                disabled={isPending}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    isActive ? "bg-red-500" : "bg-muted",
                                    isPending && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <span className="sr-only">Toggle {incident.label}</span>
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        isActive ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
