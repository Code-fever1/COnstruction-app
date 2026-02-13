import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ContractorManagement from '@/components/ContractorManagement';

export default async function OwnerContractorsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    if ((session.user as any).role !== 'owner') {
        redirect('/dashboard/accountant');
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ContractorManagement />
            </main>
        </div>
    );
}
