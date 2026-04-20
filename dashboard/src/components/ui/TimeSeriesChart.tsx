import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface TimeSeriesChartProps {
    data: any[];
    dataKey: string;
    xAxisKey: string;
    color?: string;
    sloThreshold?: number;
    sloLabel?: string;
    height?: number;
    valueFormatter?: (val: number) => string;
}

export function TimeSeriesChart({
    data,
    dataKey,
    xAxisKey = 'time',
    color = '#2563eb', // Default to Tailwind blue-600
    sloThreshold,
    sloLabel = 'SLO Limit',
    height = 300,
    valueFormatter = (v) => v.toString()
}: TimeSeriesChartProps) {
    // Determine gradient id based on dataKey to ensure uniqueness
    const gradientId = `fill-${dataKey}`;

    return (
        <div className="w-full text-foreground" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                    <XAxis
                        dataKey={xAxisKey}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={valueFormatter}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                        }}
                        formatter={(value: any) => [valueFormatter(value as number), dataKey]}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                    />

                    {sloThreshold !== undefined && (
                        <ReferenceLine
                            y={sloThreshold}
                            stroke="hsl(var(--destructive))"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{
                                position: 'insideTopLeft',
                                value: sloLabel,
                                fill: 'hsl(var(--destructive))',
                                fontSize: 13,
                                fontWeight: 600
                            }}
                        />
                    )}

                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={4}
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: 7, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
