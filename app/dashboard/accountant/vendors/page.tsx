import Navbar from '@/components/Navbar';
import VendorManagement from '@/components/VendorManagement';

export default function VendorsPage() {
    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <VendorManagement />
            </main>
        </div>
    );
}
