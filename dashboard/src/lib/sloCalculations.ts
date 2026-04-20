export const calculateErrorRate = (errorBreakdown: Record<string, number>, traffic: number): number => {
    const totalErrors = Object.values(errorBreakdown || {}).reduce((a, b) => a + b, 0);
    const safeTraffic = Math.max(traffic, 1);
    return (totalErrors / safeTraffic) * 100;
};

export const getStatus = (val: number, threshold: number): "healthy" | "warning" | "critical" => {
    if (val > threshold) return "critical";
    if (val > threshold * 0.8) return "warning";
    return "healthy";
};

export const getReverseStatus = (val: number, threshold: number): "healthy" | "warning" | "critical" => {
    if (val < threshold) return "critical";
    if (val < threshold * 1.1) return "warning";
    return "healthy";
};
