import { Suspense } from 'react';
import ServerSponsorDashboard from '../server-dashboard';

interface OptimizedPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function OptimizedSponsorDashboard({ params }: OptimizedPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading optimized dashboard...</p>
        </div>
      </div>
    }>
      {await ServerSponsorDashboard({ orgId })}
    </Suspense>
  );
} 