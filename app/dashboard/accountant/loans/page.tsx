import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import LoanManagement from '@/components/LoanManagement';

export default async function LoansPage() {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoanManagement />
      </div>
    </div>
  );
}
