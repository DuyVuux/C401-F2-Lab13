import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TokenBarChart } from './TokenBarChart';

global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

describe('TokenBarChart', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <TokenBarChart inTokens={100} outTokens={500} />
        );
        expect(container).toBeInTheDocument();
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
});
