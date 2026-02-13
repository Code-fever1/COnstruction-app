import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ProjectsList from '@/components/ProjectsList';

export default async function ProjectsPage() {
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
      <ProjectsList />
    </div>
  );
}
