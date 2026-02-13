'use client';

import { useEffect, useState } from 'react';

interface Project {
  _id: string;
  name: string;
}

interface Loan {
  _id: string;
  projectId: { _id: string; name: string };
  borrowerName: string;
  amountGiven: number;
  dateGiven: string;
  amountReturned: number;
  dateReturned?: string;
  description?: string;
  status: string;
  loanType: string;
  direction?: string;
  linkedProjectId?: { _id: string; name: string };
  linkedLoanId?: string;
}

type TabType = 'all' | 'inter-project' | 'external';

export default function LoanManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const [formData, setFormData] = useState({
    projectId: '',
    loanType: 'external' as 'external' | 'inter-project',
    borrowerName: '',
    linkedProjectId: '',
    amountGiven: '',
    dateGiven: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [returnData, setReturnData] = useState({
    amountReturned: '',
    dateReturned: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchProjects();
    fetchLoans();
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

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loans');
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      projectId: loan.projectId._id,
      loanType: (loan.loanType || 'external') as 'external' | 'inter-project',
      borrowerName: loan.borrowerName || '',
      linkedProjectId: loan.linkedProjectId?._id || '',
      amountGiven: loan.amountGiven.toString(),
      dateGiven: new Date(loan.dateGiven).toISOString().split('T')[0],
      description: loan.description || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingLoan(null);
    setFormData({
      projectId: '',
      loanType: 'external',
      borrowerName: '',
      linkedProjectId: '',
      amountGiven: '',
      dateGiven: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        projectId: formData.projectId,
        amountGiven: parseFloat(formData.amountGiven),
        dateGiven: new Date(formData.dateGiven),
        description: formData.description,
        loanType: formData.loanType,
      };

      if (formData.loanType === 'external') {
        payload.borrowerName = formData.borrowerName;
      } else {
        payload.linkedProjectId = formData.linkedProjectId;
      }

      if (editingLoan) {
        // Submit Edit Request
        const requestPayload = {
          collectionName: 'Loan',
          originalId: editingLoan._id,
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
        // Create New Loan
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create loan');
        }
      }

      resetForm();
      fetchLoans();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    setLoading(true);

    try {
      const loan = loans.find((l) => l._id === loanId);
      if (!loan) throw new Error('Loan not found');

      const newAmountReturned = parseFloat(returnData.amountReturned);

      // Calculate new status based on input
      let status = 'pending';
      if (newAmountReturned >= loan.amountGiven) {
        status = 'returned';
      } else if (newAmountReturned > 0) {
        status = 'partial';
      }

      const payload = {
        amountReturned: newAmountReturned,
        dateReturned: new Date(returnData.dateReturned),
        status: status
      };

      // Create Request for Return Update
      const requestPayload = {
        collectionName: 'Loan',
        originalId: loanId,
        newData: payload,
        projectId: loan.projectId._id,
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit return request');
      }

      alert('Return request submitted successfully! Waiting for owner approval.');
      setShowReturnForm(null);
      setReturnData({
        amountReturned: '',
        dateReturned: new Date().toISOString().split('T')[0],
      });
      fetchLoans();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter loans by project and tab — hide receivable records to avoid duplicates
  const filteredLoans = loans.filter((loan) => {
    // Never show receivable records — inter-project loans only show once (as payable)
    if (loan.loanType === 'inter-project' && loan.direction === 'receivable') return false;
    const projectMatch = filterProject === 'all' || loan.projectId?._id === filterProject;
    if (activeTab === 'all') return projectMatch;
    if (activeTab === 'inter-project') return projectMatch && loan.loanType === 'inter-project';
    if (activeTab === 'external') return projectMatch && (!loan.loanType || loan.loanType === 'external');
    return projectMatch;
  });

  const totalAmountGiven = filteredLoans.reduce((sum, loan) => sum + loan.amountGiven, 0);
  const totalOutstanding = filteredLoans.reduce((sum, loan) => sum + (loan.amountGiven - loan.amountReturned), 0);

  // Available projects for the linked project dropdown (exclude the selected source project)
  const availableLinkedProjects = projects.filter((p) => p._id !== formData.projectId);

  if (loading && loans.length === 0) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Add Loan
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {editingLoan ? 'Request Edit for Loan' : 'Add New Loan'}
            </h2>
            {editingLoan && (
              <p className="text-sm text-yellow-600 mt-1">
                Note: Edits will be submitted as a request and must be approved by the owner.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Loan Type Toggle */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors ${formData.loanType === 'external' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="loanType"
                    value="external"
                    checked={formData.loanType === 'external'}
                    onChange={() => setFormData({ ...formData, loanType: 'external', borrowerName: '', linkedProjectId: '' })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">External</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors ${formData.loanType === 'inter-project' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="loanType"
                    value="inter-project"
                    checked={formData.loanType === 'inter-project'}
                    onChange={() => setFormData({ ...formData, loanType: 'inter-project', borrowerName: '', linkedProjectId: '' })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">Inter-Project</span>
                </label>
              </div>
            </div>

            {/* Source Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.loanType === 'inter-project' ? 'From Project (Giving) *' : 'Project *'}
              </label>
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

            {/* Conditional: Borrower Name or Target Project */}
            {formData.loanType === 'external' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Borrower Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.borrowerName}
                  onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">To Project (Receiving) *</label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.linkedProjectId}
                  onChange={(e) => setFormData({ ...formData, linkedProjectId: e.target.value })}
                >
                  <option value="">Select Target Project</option>
                  {availableLinkedProjects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount *
                {editingLoan && (
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (Original: {editingLoan.amountGiven})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                step="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.amountGiven}
                onChange={(e) => setFormData({ ...formData, amountGiven: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.dateGiven}
                onChange={(e) => setFormData({ ...formData, dateGiven: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
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
              className={`px-4 py-2 text-white rounded-md ${editingLoan ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
            >
              {loading ? 'Submitting...' : editingLoan ? 'Request Update' : 'Add Loan'}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { key: 'all' as TabType, label: 'All Loans' },
              { key: 'inter-project' as TabType, label: 'Inter-Project' },
              { key: 'external' as TabType, label: 'External' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Summary Badges */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-baseline px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide mr-2">Given</span>
                <span className="text-lg font-bold text-blue-700">Rs {totalAmountGiven.toLocaleString()}</span>
              </div>
              <div className="inline-flex items-baseline px-3 py-1 rounded-full bg-red-50 border border-red-100">
                <span className="text-xs font-medium text-red-600 uppercase tracking-wide mr-2">Outstanding</span>
                <span className="text-lg font-bold text-red-700">Rs {totalOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No loans found for this view.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const outstanding = loan.amountGiven - loan.amountReturned;
                  const isInterProject = loan.loanType === 'inter-project';
                  return (
                    <tr key={loan._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(loan.dateGiven).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.projectId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isInterProject
                          ? loan.linkedProjectId?.name || 'N/A'
                          : loan.borrowerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isInterProject
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {isInterProject
                            ? (loan.direction === 'payable' ? '↗ Payable' : '↙ Receivable')
                            : 'External'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        Rs {loan.amountGiven.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        Rs {loan.amountReturned.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        Rs {outstanding.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${loan.status === 'returned'
                            ? 'bg-green-100 text-green-800'
                            : loan.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingLoan(loan)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(loan)}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                          >
                            Edit
                          </button>
                          {outstanding > 0 && (
                            <button
                              onClick={() => {
                                setShowReturnForm(loan._id);
                                setReturnData({
                                  ...returnData,
                                  amountReturned: loan.amountReturned.toString()
                                });
                              }}
                              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                            >
                              Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Loan Modal */}
      {viewingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
              <button
                onClick={() => setViewingLoan(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingLoan.projectId?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Type:</span> {viewingLoan.loanType === 'inter-project' ? 'Inter-Project' : 'External'}</p>
                  {viewingLoan.loanType === 'inter-project' ? (
                    <>
                      <p><span className="font-medium text-gray-700">Direction:</span> {viewingLoan.direction === 'payable' ? 'Payable (Given)' : 'Receivable (Owed)'}</p>
                      <p><span className="font-medium text-gray-700">Borrower:</span> {viewingLoan.linkedProjectId?.name || 'N/A'}</p>
                    </>
                  ) : (
                    <p><span className="font-medium text-gray-700">Borrower:</span> {viewingLoan.borrowerName}</p>
                  )}
                  <p><span className="font-medium text-gray-700">Date Given:</span> {new Date(viewingLoan.dateGiven).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Date Returned:</span> {viewingLoan.dateReturned ? new Date(viewingLoan.dateReturned).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Amount Given:</span> Rs {viewingLoan.amountGiven.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Amount Returned:</span> Rs {viewingLoan.amountReturned.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Outstanding:</span> Rs {(viewingLoan.amountGiven - viewingLoan.amountReturned).toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Status:</span> {viewingLoan.status}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingLoan.description || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Form Modal */}
      {showReturnForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Loan Return</h3>
            <p className="text-sm text-yellow-600 mb-4">
              Requests will be sent to the owner for approval.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount Returned *</label>
                <div className="text-xs text-gray-500 mb-1">
                  Update this to the new total. (e.g. if 500 was returned before and you got 200 more, enter 700).
                </div>
                <input
                  type="number"
                  required
                  step="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={returnData.amountReturned}
                  onChange={(e) => setReturnData({ ...returnData, amountReturned: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date Returned *</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={returnData.dateReturned}
                  onChange={(e) => setReturnData({ ...returnData, dateReturned: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowReturnForm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReturn(showReturnForm)}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
