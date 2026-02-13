'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  _id: string;
  name: string;
  type: string;
  status: string;
  agreement: {
    totalAmount: number;
    startDate: string;
    endDate: string;
  };
  customerName?: string;
  supervisor?: string;
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
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

      fetchProjects();
    } catch (error: any) {
      alert(error.message || 'Error updating project');
    }
  };

  const handleDelete = (projectId: string, projectName: string) => {
    setDeleteModal({ id: projectId, name: projectName });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/projects/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      setDeleteModal(null);
      fetchProjects();
    } catch (error: any) {
      alert(error.message || 'Error deleting project');
    } finally {
      setDeleting(false);
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
        <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
        <Link
          href="/dashboard/owner/projects/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Create New Project
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Project</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Budget</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Duration</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Supervisor</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                    No projects found. Create your first project!
                  </td>
                </tr>
              ) : (
                projects.map((project, index) => (
                  <tr key={project._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 capitalize">
                      {project.type}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {project.customerName || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      Rs {project.agreement.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {project.agreement?.startDate ? new Date(project.agreement.startDate).toLocaleDateString() : 'N/A'} - {project.agreement?.endDate ? new Date(project.agreement.endDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {project.supervisor || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/dashboard/owner/projects/${project._id}`}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-center"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/owner/projects/${project._id}/edit`}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors text-center"
                        >
                          Edit
                        </Link>
                        {project.status !== 'completed' && (
                          <button
                            onClick={() => handleMarkComplete(project._id, project.name)}
                            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(project._id, project.name)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !deleting && setDeleteModal(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Delete Project</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteModal.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
