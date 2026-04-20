import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-background text-foreground dark">
        <DashboardLayout />
      </main>
    </QueryClientProvider>
  );
}

export default App;
