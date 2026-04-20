import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface TokenBarChartProps {
    inTokens: number;
    outTokens: number;
    height?: number;
}

export function TokenBarChart({ inTokens, outTokens, height = 260 }: TokenBarChartProps) {
    const data = [
        { name: 'Input', tokens: inTokens, color: '#3b82f6' },   // Blue
        { name: 'Output', tokens: outTokens, color: '#10b981' }  // Emerald
    ];

    return (
        <div className="w-full text-slate-200" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={13}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#f8fafc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                        }}
                    />
                    <Bar dataKey="tokens" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
