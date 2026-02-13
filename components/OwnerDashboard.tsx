'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import EditRequestsList from './EditRequestsList';

interface Project {
  _id: string;
  name: string;
  type: string;
  status: string;
  agreement: {
    totalAmount: number;
  };
}

export default function OwnerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const [projectsRes, expensesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/expenses')
      ]);
      
      const projectsData = await projectsRes.json();
      const expensesData = await expensesRes.json();
      
      setProjects(projectsData);
      
      // Calculate total pending payments
      const pending = expensesData
        .filter((exp: any) => exp.type === 'material' && exp.vendorPaymentStatus === 'pending')
        .reduce((sum: number, exp: any) => sum + exp.amount, 0);
      
      setPendingPayments(pending);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleMarkComplete = async (projectId: string, projectName: string) => {
    if (!confirm(`Mark "${projectName}" as completed?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project');
      }

      // Refresh the projects list
      fetchProjects();
    } catch (error: any) {
      alert(error.message || 'Error updating project');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <Link
          href="/dashboard/owner/projects/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Create New Project
        </Link>
      </div>


      <div className="mb-8">
        <EditRequestsList />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Projects</h3>
          <p className="text-3xl font-bold text-indigo-600">{projects.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Projects</h3>
          <p className="text-3xl font-bold text-green-600">
            {projects.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed Projects</h3>
          <p className="text-3xl font-bold text-blue-600">
            {projects.filter((p) => p.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No projects found. Create your first project!
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <p className="text-gray-500 text-sm mt-1">Budget: Rs {project.agreement.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/owner/projects/${project._id}`}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                        >
                          View
                        </Link>
                        {project.status !== 'completed' && (
                          <button
                            onClick={() => handleMarkComplete(project._id, project.name)}
                            className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
}
