import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ExpenseManagement from '@/components/ExpenseManagement';

export default async function ExpensesPage() {
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
        <ExpenseManagement />
      </div>
    </div>
  );
}
