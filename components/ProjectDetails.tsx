'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  _id: string;
  name: string;
  type: string;
  customerName?: string;
  investorPercentage?: { customer: number; company: number };
  agreement: {
    totalAmount: number;
    startDate: string;
    endDate: string;
    description?: string;
  };
  supervisor?: string;
  contractors?: string[];
  vendors?: string[];
  status: string;
}

interface Summary {
  income: { total: number };
  expenses: { total: number };
  profit: number;
  cashPosition: { total: number };
}

export default function ProjectDetails({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
    fetchSummary();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/summary?projectId=${projectId}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!project) {
    return <div className="text-center">Project not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/owner"
          className="text-indigo-600 hover:text-indigo-500 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-green-600">
            Rs {(summary?.income?.total ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">
            Rs {(summary?.expenses?.total ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Profit/Loss</h3>
          <p className={`text-3xl font-bold ${(summary?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rs {(summary?.profit ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cash Position</h3>
          <p className="text-3xl font-bold text-indigo-600">
            Rs {(summary?.cashPosition?.total ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="text-lg font-medium">{project.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-medium">{project.status}</p>
          </div>
          {project.customerName && (
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="text-lg font-medium">{project.customerName}</p>
            </div>
          )}
          {project.investorPercentage && (
            <div>
              <p className="text-sm text-gray-500">Investment Split</p>
              <p className="text-lg font-medium">
                Customer: {project.investorPercentage.customer}% | Company: {project.investorPercentage.company}%
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Budget</p>
            <p className="text-lg font-medium">Rs {project.agreement.totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-lg font-medium">
              {project.agreement?.startDate ? new Date(project.agreement.startDate).toLocaleDateString() : 'N/A'} -{' '}
              {project.agreement?.endDate ? new Date(project.agreement.endDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          {project.supervisor && (
            <div>
              <p className="text-sm text-gray-500">Supervisor</p>
              <p className="text-lg font-medium">{project.supervisor}</p>
            </div>
          )}
        </div>
        {project.contractors && project.contractors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Contractors</p>
            <div className="flex flex-wrap gap-2">
              {project.contractors.map((contractor, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {contractor}
                </span>
              ))}
            </div>
          </div>
        )}
        {project.vendors && project.vendors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Vendors</p>
            <div className="flex flex-wrap gap-2">
              {project.vendors.map((vendor, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {vendor}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Link
          href={`/dashboard/owner/summary?projectId=${projectId}`}
          className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
        >
          View Full Summary
        </Link>
      </div>
    </div>
  );
}
