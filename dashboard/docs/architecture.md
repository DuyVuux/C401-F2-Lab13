# Dashboard Architecture & Design Decisions

## 1. High-Level Architecture
This observability dashboard is designed for high-density data visualization, tracking the core SLIs of the Lab13 LLM Healthcare application. It operates via an active-polling cycle querying the backend metric state.

**Frontend System Design:**
- **Framework:** React 18 / Vite 5 (Fast local orchestration, RSC not needed for pure SPA monitoring)
- **State Management & Fetching:** `@tanstack/react-query` to handle periodic polling (15s), background data updates, and graceful error retry backoff without blocking the UI.
- **Styling:** TailwindCSS 3.x, customized for dark-mode by default (Grafana-esque deep blacks and glowing alerts).
- **Visualization:** Recharts for optimized time-series SVG plotting. Chosen over ECharts for lighter React-native bundle and simpler declarative components. Include custom Tooltips and ReferenceLines for SLOs.

**Data Flow Sequence:**
\`\`\`mermaid
sequenceDiagram
    participant UI as Dashboard Panel
    participant RQ as React Query Loader
    participant API as Axios Client
    participant SV as Backend (FastAPI)

    UI->>RQ: Subscribe (interval: 15s)
    RQ->>API: GET /metrics
    API->>SV: Execute HTTP with API Key wrapper if needed
    SV-->>API: 200 OK + JSON
    API-->>RQ: Cleaned Typescript Domain Model Map
    RQ-->>UI: Cache hit -> Re-render Virtual DOM
\`\`\`

## 2. Folder Structure
- `src/lib/api.ts`: Centralizes Axios logic, data transformation, and TypeScript types synced with standard API contract.
- `src/lib/utils.ts`: Utility for tailwind merges (`clsx`, `twMerge`).
- `src/components/ui/`: Dumb presentation components (`MetricCard`, `TimeSeriesChart`) focusing on pure rendering rules.
- `src/components/incidents/`: Actionable UI mutating `/incidents` endpoints.
- `src/components/dashboard/`: Smart container wiring `react-query` contexts to `ui`.

## 3. Visualization Rules (Strict)
- **Red** (`text-red-500`): Error conditions, SLO breaches.
- **Amber/Yellow** (`text-amber-500`): Approaching limits (e.g. latency > p50 but < p95 limits).
- **Green** (`text-green-500`): Healthy.
- **Cards & Charts**: Every time-series includes `ReferenceLine` mapping from `slo.yaml` limits (e.g. 3000ms latency, 2% error rate).

## 4. Engineering Constraints Respected
- **Types**: Extracted directly from backend definitions (`latency_p50`, `tokens_in_total`).
- **Resiliency**: If `/health` fails, the dashboard explicitly surfaces standard Error boundaries rather than silent failure.
- **Correlation ID**: Added standard `x-request-id` header log mapping config for dashboard polling loops to ensure trace tracking in backend log schema `logging_schema.json`.
