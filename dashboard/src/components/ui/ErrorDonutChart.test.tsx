import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorDonutChart } from './ErrorDonutChart';

global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

describe('ErrorDonutChart', () => {
    it('renders without crashing on empty errors', () => {
        const { container } = render(
            <ErrorDonutChart errorBreakdown={{}} />
        );
        expect(container).toBeInTheDocument();
    });

    it('renders with specific error components', () => {
        const { container } = render(
            <ErrorDonutChart errorBreakdown={{ "TIMEOUT": 5, "SERVER_ERROR": 2 }} />
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
});
