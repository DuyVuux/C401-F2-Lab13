import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ResponsiveContainer } from 'recharts';

import { vi } from 'vitest';

// Mock ResizeObserver for Recharts ResponsiveContainer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

describe('TimeSeriesChart', () => {
    const mockData = [
        { time: '10:00', value: 100 },
        { time: '10:01', value: 200 }
    ];

    it('renders without crashing even with empty data', () => {
        const { container } = render(
            <TimeSeriesChart data={[]} dataKey="value" xAxisKey="time" />
        );
        expect(container).toBeInTheDocument();
    });

    it('renders with test data and sloThreshold', () => {
        const { container } = render(
            <TimeSeriesChart data={mockData} dataKey="value" xAxisKey="time" sloThreshold={150} />
        );
        // It should render area chart structure
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
        expect(container.querySelector('defs')).toBeInTheDocument(); // Gradient defs should exist
    });
});
