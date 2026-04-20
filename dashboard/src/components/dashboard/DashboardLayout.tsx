import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, MetricsResponse } from '../../lib/api';
import { MetricCard } from '../ui/MetricCard';
import { TimeSeriesChart } from '../ui/TimeSeriesChart';
import { IncidentManager } from '../incidents/IncidentManager';
import { format } from 'date-fns';
import { Activity, Clock, DollarSign, BrainCircuit, AlertTriangle, CheckCircle, Database } from 'lucide-react';

// Keep max 60 data points (assuming 15s refresh, this is 15 minutes of hi-res window)
const MAX_HISTORY_POINTS = 60;

export function DashboardLayout() {
    const [metricsHistory, setMetricsHistory] = useState<(MetricsResponse & { time: string })[]>([]);

    // Health Query - Polls every 15s
    const { data: health, isError: isHealthError } = useQuery({
        queryKey: ['health'],
        queryFn: api.getHealth,
        refetchInterval: 15000,
    });

    // Metrics Query - Polls every 15s
    const { data: metrics, isLoading: isMetricsLoading } = useQuery({
        queryKey: ['metrics'],
        queryFn: api.getMetrics,
        refetchInterval: 15000,
    });

    const displayMetrics = metrics || {
        traffic: 0,
        latency_p50: 0,
        latency_p95: 0,
        latency_p99: 0,
        avg_cost_usd: 0,
        total_cost_usd: 0,
        tokens_in_total: 0,
        tokens_out_total: 0,
        error_breakdown: {},
        quality_avg: 1.0,
    };

    // Effect to push snapshot into time-series cache
    useEffect(() => {
        if (metrics) {
            setMetricsHistory(prev => {
                const newPoint = { ...metrics, time: format(new Date(), 'HH:mm:ss') };
                return [...prev, newPoint].slice(-MAX_HISTORY_POINTS);
            });
        }
    }, [metrics]);

    if (isMetricsLoading && !metrics && !isHealthError) {
        return <div className="flex h-screen items-center justify-center font-mono">Loading telemetry...</div>;
    }

    // Calculate Error Rate
    const totalErrors = Object.values(displayMetrics.error_breakdown || {}).reduce((a, b) => a + b, 0);
    const totalRequests = displayMetrics.traffic || 1; // Prevent div by zero
    const errorRate = (totalErrors / totalRequests) * 100;

    // Determine SLO statuses based on slo.yaml
    const getStatus = (val: number, threshold: number): "healthy" | "warning" | "critical" => {
        if (val > threshold) return "critical";
        if (val > threshold * 0.8) return "warning";
        return "healthy";
    };

    const getReverseStatus = (val: number, threshold: number): "healthy" | "warning" | "critical" => {
        if (val < threshold) return "critical";
        if (val < threshold * 1.1) return "warning";
        return "healthy";
    }

    const latencyStatus = getStatus(displayMetrics.latency_p95, 3000);
    const errorStatus = getStatus(errorRate, 2);
    const costStatus = getStatus(displayMetrics.total_cost_usd, 2.5);
    const qualityStatus = getReverseStatus(displayMetrics.quality_avg, 0.75);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* HEADER */}
            <header className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Observability</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Lab13 Enterprise Analytics & SLO Tracking</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${isHealthError || (!metrics && !isMetricsLoading) ? 'border-red-500/50 bg-red-500/10 text-red-500' : 'border-green-500/50 bg-green-500/10 text-green-500'
                        }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isHealthError || (!metrics && !isMetricsLoading) ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {isHealthError || (!metrics && !isMetricsLoading) ? 'API Disconnected' : 'API Healthy'}
                    </div>
                </div>
            </header>

            {/* METRIC CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Latency (p95)"
                    value={`${displayMetrics.latency_p95.toFixed(0)} ms`}
                    subValue={`p50: ${displayMetrics.latency_p50.toFixed(0)}ms | p99: ${displayMetrics.latency_p99.toFixed(0)}ms`}
                    icon={<Clock className="w-4 h-4" />}
                    status={latencyStatus}
                />
                <MetricCard
                    title="Error Rate"
                    value={`${errorRate.toFixed(2)}%`}
                    subValue={`${totalErrors} failures / ${displayMetrics.traffic} req`}
                    icon={<AlertTriangle className="w-4 h-4" />}
                    status={errorStatus}
                />
                <MetricCard
                    title="Daily Cost"
                    value={`$${displayMetrics.total_cost_usd.toFixed(2)}`}
                    subValue={`Avg: $${displayMetrics.avg_cost_usd.toFixed(4)}/req`}
                    icon={<DollarSign className="w-4 h-4" />}
                    status={costStatus}
                />
                <MetricCard
                    title="Quality Score"
                    value={displayMetrics.quality_avg.toFixed(2)}
                    subValue="Scale: 0.0 - 1.0"
                    icon={<CheckCircle className="w-4 h-4" />}
                    status={qualityStatus}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard className="lg:col-span-2"
                    title="Total Traffic (Requests)"
                    value={displayMetrics.traffic}
                    icon={<Activity className="w-4 h-4" />}
                />
                <MetricCard className="lg:col-span-2"
                    title="Token Usage"
                    value={displayMetrics.tokens_in_total + displayMetrics.tokens_out_total}
                    subValue={`IN: ${displayMetrics.tokens_in_total} | OUT: ${displayMetrics.tokens_out_total}`}
                    icon={<Database className="w-4 h-4" />}
                />
            </div>

            {/* CHARTS & INCIDENTS REPOSITORY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-4 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                            Latency History (P95)
                        </h3>
                        <TimeSeriesChart
                            data={metricsHistory}
                            dataKey="latency_p95"
                            xAxisKey="time"
                            color="hsl(var(--amber-500))"
                            sloThreshold={3000}
                            sloLabel="SLO Limit (3000ms)"
                            height={260}
                            valueFormatter={(v) => `${v}ms`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <h3 className="font-semibold text-lg mb-4 flex items-center">
                                <BrainCircuit className="w-4 h-4 mr-2 text-muted-foreground" />
                                Quality Score Degradation
                            </h3>
                            <TimeSeriesChart
                                data={metricsHistory}
                                dataKey="quality_avg"
                                xAxisKey="time"
                                color="hsl(var(--blue-500))"
                                sloThreshold={0.75}
                                sloLabel="SLO Limit (0.75)"
                                height={200}
                            />
                        </div>
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <h3 className="font-semibold text-lg mb-4 flex items-center">
                                <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                                Cost Accumulation
                            </h3>
                            <TimeSeriesChart
                                data={metricsHistory}
                                dataKey="total_cost_usd"
                                xAxisKey="time"
                                color="hsl(var(--green-500))"
                                sloThreshold={2.50}
                                sloLabel="SLO Daily Budget ($2.5)"
                                height={200}
                                valueFormatter={(v) => `$${v}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Incident Manager Sidebar */}
                <div>
                    <IncidentManager incidents={health?.incidents || {}} />
                </div>

            </div>
        </div>
    );
}
