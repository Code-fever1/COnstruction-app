import Navbar from '@/components/Navbar';
import ContractorManagement from '@/components/ContractorManagement';

export default function ContractorsPage() {
    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ContractorManagement />
            </main>
        </div>
    );
}
