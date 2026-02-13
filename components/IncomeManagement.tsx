'use client';

import { useEffect, useState } from 'react';

interface Project {
  _id: string;
  name: string;
}

interface Income {
  _id: string;
  projectId: { _id: string; name: string };
  amount: number;
  date: string;
  description: string;
  mode: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
  };
  cashLocation?: string;
}

export default function IncomeManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [viewingIncome, setViewingIncome] = useState<Income | null>(null);

  // ... (rest of the file until the filter UI)

  // In the return statement, inside the filter section:
  /*
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <label className="text-sm font-medium text-gray-700">Filter by Source:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="bank">Bank</option>
                <option value="locker1">Locker 1</option>
                <option value="locker2">Locker 2</option>
              </select>
            </div>
  */

  // ... (table implementation)

  // Update filter logic:
  /*
                {income
                  .filter((inc) => {
                      const projectMatch = filterProject === 'all' || inc.projectId?._id === filterProject;
                      
                      let sourceMatch = true;
                      if (filterSource === 'bank') {
                          sourceMatch = inc.mode === 'bank';
                      } else if (filterSource === 'locker1') {
                          sourceMatch = inc.mode === 'cash' && inc.cashLocation === 'locker1';
                      } else if (filterSource === 'locker2') {
                          sourceMatch = inc.mode === 'cash' && inc.cashLocation === 'locker2';
                      }
  
                      return projectMatch && sourceMatch;
                  })
                  .map((inc) => (
  */

  const [formData, setFormData] = useState({
    projectId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    mode: 'cash' as 'bank' | 'cash',
    bankName: '',
    accountNumber: '',
    cashLocation: 'locker1' as 'locker1' | 'locker2',
  });

  useEffect(() => {
    fetchProjects();
    fetchIncome();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchIncome = async () => {
    try {
      const response = await fetch('/api/income');
      const data = await response.json();
      setIncome(data);
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (inc: Income) => {
    setEditingIncome(inc);
    setFormData({
      projectId: inc.projectId._id,
      amount: inc.amount.toString(),
      date: new Date(inc.date).toISOString().split('T')[0],
      description: inc.description,
      mode: inc.mode as 'bank' | 'cash',
      bankName: inc.bankDetails?.bankName || '',
      accountNumber: inc.bankDetails?.accountNumber || '',
      cashLocation: (inc.cashLocation as 'locker1' | 'locker2') || 'locker1',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingIncome(null);
    setFormData({
      projectId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      mode: 'cash',
      bankName: '',
      accountNumber: '',
      cashLocation: 'locker1',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        projectId: formData.projectId,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        description: formData.description,
        mode: formData.mode,
      };

      if (formData.mode === 'bank') {
        payload.bankDetails = {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
        };
      } else {
        payload.cashLocation = formData.cashLocation;
      }

      if (editingIncome) {
        // Submit Edit Request
        const requestPayload = {
          collectionName: 'Income',
          originalId: editingIncome._id,
          newData: payload,
          projectId: formData.projectId,
        };

        const response = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit edit request');
        }

        alert('Edit request submitted successfully! Waiting for owner approval.');
      } else {
        // Create New Income
        const response = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create income record');
        }
      }

      resetForm();
      fetchIncome();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncome = income.filter((inc) => {
    const projectMatch = filterProject === 'all' || inc.projectId?._id === filterProject;

    let sourceMatch = true;
    if (filterSource === 'bank') {
      sourceMatch = inc.mode === 'bank';
    } else if (filterSource === 'locker1') {
      sourceMatch = inc.mode === 'cash' && inc.cashLocation === 'locker1';
    } else if (filterSource === 'locker2') {
      sourceMatch = inc.mode === 'cash' && inc.cashLocation === 'locker2';
    }

    return projectMatch && sourceMatch;
  });

  const totalAmount = filteredIncome.reduce((sum, inc) => sum + inc.amount, 0);

  if (loading && income.length === 0) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Income Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Add Income
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
          {/* ... form content ... */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {editingIncome ? 'Request Edit for Income' : 'Add New Income'}
            </h2>
            {editingIncome && (
              <p className="text-sm text-yellow-600 mt-1">
                Note: Edits will be submitted as a request and must be approved by the owner.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project *</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount *
                {editingIncome && (
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (Original: {editingIncome.amount})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                step="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Mode *</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'bank' | 'cash' })}
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {formData.mode === 'bank' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cash Location</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.cashLocation}
                  onChange={(e) => setFormData({ ...formData, cashLocation: e.target.value as 'locker1' | 'locker2' })}
                >
                  <option value="locker1">Locker 1</option>
                  <option value="locker2">Locker 2</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-white rounded-md bg-red-500 hover:bg-red-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-md ${editingIncome ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
            >
              {loading ? 'Submitting...' : editingIncome ? 'Request Update' : 'Add Income'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">All Income Records</h2>
            {/* Enhanced Total Amount Display */}
            <div className="inline-flex items-baseline px-3 py-1 rounded-full bg-green-50 border border-green-100">
              <span className="text-xs font-medium text-green-600 uppercase tracking-wide mr-2">Total Income</span>
              <span className="text-lg font-bold text-green-700">Rs {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by Source:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="bank">Bank</option>
                <option value="locker1">Locker 1</option>
                <option value="locker2">Locker 2</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncome
                .map((inc) => (
                  <tr key={inc._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inc.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {inc.projectId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{inc.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      Rs {inc.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inc.mode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inc.mode === 'bank'
                        ? `${inc.bankDetails?.bankName || 'N/A'} - ${inc.bankDetails?.accountNumber || 'N/A'}`
                        : inc.cashLocation?.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingIncome(inc)}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(inc)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Income Details</h3>
              <button
                onClick={() => setViewingIncome(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingIncome.date).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingIncome.projectId?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingIncome.amount.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Mode:</span> {viewingIncome.mode}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingIncome.description || 'N/A'}
                </p>
              </div>

              {viewingIncome.mode === 'bank' ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Bank Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Bank Name:</span> {viewingIncome.bankDetails?.bankName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Account Number:</span> {viewingIncome.bankDetails?.accountNumber || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Cash Details</h4>
                  <p className="text-sm"><span className="font-medium text-gray-700">Location:</span> {viewingIncome.cashLocation || 'N/A'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
