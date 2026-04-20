import {
    LineChart,
    Line,
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
    return (
        <div className="w-full text-foreground" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
                            borderRadius: '8px'
                        }}
                        formatter={(value: number) => [valueFormatter(value), dataKey]}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                    />

                    {sloThreshold !== undefined && (
                        <ReferenceLine
                            y={sloThreshold}
                            stroke="hsl(var(--destructive))"
                            strokeDasharray="4 4"
                            label={{
                                position: 'insideTopLeft',
                                value: sloLabel,
                                fill: 'hsl(var(--destructive))',
                                fontSize: 12
                            }}
                        />
                    )}

                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
