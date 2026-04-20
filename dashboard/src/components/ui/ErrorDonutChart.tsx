import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface ErrorDonutChartProps {
    errorBreakdown: Record<string, number>;
    height?: number;
}

const COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export function ErrorDonutChart({ errorBreakdown, height = 260 }: ErrorDonutChartProps) {
    const data = Object.entries(errorBreakdown || {}).map(([key, value]) => ({
        name: key,
        value
    })).filter(item => item.value > 0);

    // If no errors, show a highly visual "Zero Errors" donut chart
    const displayData = data.length > 0 ? data : [{ name: 'Healthy (No Errors)', value: 1 }];
    const displayColors = data.length > 0 ? COLORS : ['#10b981']; // Emerald for healthy

    return (
        <div className="w-full text-slate-200" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={displayData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {displayData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={displayColors[index % displayColors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#f8fafc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
