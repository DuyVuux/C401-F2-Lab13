import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
    it('renders the title and value correctly', () => {
        render(<MetricCard title="Test Metric" value="123" />);
        expect(screen.getByText('Test Metric')).toBeInTheDocument();
        expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('renders subValue when provided', () => {
        render(<MetricCard title="Test" value="1" subValue="Sub text here" />);
        expect(screen.getByText('Sub text here')).toBeInTheDocument();
    });

    it('applies health status styling', () => {
        const { container } = render(<MetricCard title="Test" value="1" status="healthy" />);
        expect(container.firstChild).toHaveClass('border-border/40');
    });

    it('applies critical status styling', () => {
        const { container } = render(<MetricCard title="Test" value="1" status="critical" />);
        expect(container.firstChild).toHaveClass('border-rose-500/70');
    });
});
