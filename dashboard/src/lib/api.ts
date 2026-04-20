import axios from 'axios';

// The application explicitly centralizes state and metric accumulation 
// We proxy this through our fast API wrapper
const apiClient = axios.create({
    baseURL: '', // Proxy through Vite server
    timeout: 5000,
});

export interface HealthResponse {
    ok: boolean;
    tracing_enabled: boolean;
    incidents: Record<string, boolean>;
}

export interface MetricsResponse {
    traffic: number;
    latency_p50: number;
    latency_p95: number;
    latency_p99: number;
    avg_cost_usd: number;
    total_cost_usd: number;
    tokens_in_total: number;
    tokens_out_total: number;
    error_breakdown: Record<string, number>;
    quality_avg: number;
}

// Ensure `x-request-id` is properly tracked if possible - typical for advanced observability
apiClient.interceptors.request.use((config) => {
    config.headers['x-dashboard-request'] = 'true';
    return config;
});

export const api = {
    getHealth: async (): Promise<HealthResponse> => {
        const { data } = await apiClient.get<HealthResponse>('/health');
        return data;
    },

    getMetrics: async (): Promise<MetricsResponse> => {
        const { data } = await apiClient.get<MetricsResponse>('/metrics');
        return data;
    },

    toggleIncident: async (name: string, enable: boolean): Promise<any> => {
        const action = enable ? 'enable' : 'disable';
        const { data } = await apiClient.post(`/incidents/${name}/${action}`);
        return data;
    }
};
