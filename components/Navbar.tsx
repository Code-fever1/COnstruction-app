'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const linkClass = (isActive: boolean) =>
  `${isActive
    ? 'border-indigo-500 text-gray-900'
    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`;

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const role = (session.user as any)?.role;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Construction CMS</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {role === 'owner' && (
                <>
                  <Link href="/dashboard/owner" className={linkClass(pathname === '/dashboard/owner')}>
                    Dashboard
                  </Link>
                  <Link href="/dashboard/owner/projects" className={linkClass(pathname === '/dashboard/owner/projects')}>
                    Projects
                  </Link>
                  <Link href="/dashboard/owner/vendors" className={linkClass(pathname === '/dashboard/owner/vendors')}>
                    Vendors
                  </Link>
                  <Link href="/dashboard/owner/contractors" className={linkClass(pathname === '/dashboard/owner/contractors')}>
                    Contractors
                  </Link>
                  <Link href="/dashboard/owner/summary" className={linkClass(pathname === '/dashboard/owner/summary')}>
                    Summary
                  </Link>
                </>
              )}
              {role === 'accountant' && (
                <>
                  <Link href="/dashboard/accountant" className={linkClass(pathname === '/dashboard/accountant')}>
                    Dashboard
                  </Link>
                  <Link href="/dashboard/accountant/expenses" className={linkClass(pathname === '/dashboard/accountant/expenses')}>
                    Expenses
                  </Link>
                  <Link href="/dashboard/accountant/income" className={linkClass(pathname === '/dashboard/accountant/income')}>
                    Income
                  </Link>
                  <Link href="/dashboard/accountant/loans" className={linkClass(pathname === '/dashboard/accountant/loans')}>
                    Loans
                  </Link>
                  <Link href="/dashboard/accountant/vendors" className={linkClass(pathname === '/dashboard/accountant/vendors')}>
                    Vendors
                  </Link>
                  <Link href="/dashboard/accountant/contractors" className={linkClass(pathname === '/dashboard/accountant/contractors')}>
                    Contractors
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-4">
              {session.user?.name} ({role})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
