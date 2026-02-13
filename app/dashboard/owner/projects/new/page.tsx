import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ProjectForm from '@/components/ProjectForm';

export default async function NewProjectPage() {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Project</h1>
        <ProjectForm />
      </div>
    </div>
  );
}
