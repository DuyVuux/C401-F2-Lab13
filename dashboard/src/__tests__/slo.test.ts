import { describe, it, expect } from 'vitest';
import { calculateErrorRate, getStatus, getReverseStatus } from '../lib/sloCalculations';

describe('SLO Logic Calculations', () => {
    it('correctly calculates error rates', () => {
        const errorBreakdown = { "tool_fail": 2, "rag_slow": 3 };
        const traffic = 100;
        const rate = calculateErrorRate(errorBreakdown, traffic);
        expect(rate).toBe(5);
    });

    it('prevents division by zero in error rate', () => {
        const rate = calculateErrorRate({}, 0);
        expect(rate).toBe(0);
    });

    it('correctly evaluates standard status thresholds (Critical when OVER)', () => {
        // 3000ms threshold
        expect(getStatus(3500, 3000)).toBe('critical');
        // warning zone > 2400 (80% of 3000)
        expect(getStatus(2500, 3000)).toBe('warning');
        // healthy zone <= 2400
        expect(getStatus(2000, 3000)).toBe('healthy');
    });

    it('correctly evaluates reverse status thresholds (Critical when UNDER)', () => {
        // 0.75 Quality Score threshold
        expect(getReverseStatus(0.5, 0.75)).toBe('critical');
        // warning zone < 0.825 (110% of 0.75)
        expect(getReverseStatus(0.8, 0.75)).toBe('warning');
        // healthy zone >= 0.825
        expect(getReverseStatus(0.9, 0.75)).toBe('healthy');
    });
});
