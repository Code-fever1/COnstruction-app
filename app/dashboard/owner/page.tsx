import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import OwnerDashboard from '@/components/OwnerDashboard';

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if ((session.user as any).role !== 'owner') {
    redirect('/dashboard/accountant');
  }

  return (
    <div>
      <Navbar />
      <OwnerDashboard />
    </div>
  );
}
