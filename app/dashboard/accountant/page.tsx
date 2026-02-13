import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import AccountantDashboard from '@/components/AccountantDashboard';

export default async function AccountantDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if ((session.user as any).role !== 'accountant') {
    redirect('/dashboard/owner');
  }

  return (
    <div>
      <Navbar />
      <AccountantDashboard />
    </div>
  );
}
