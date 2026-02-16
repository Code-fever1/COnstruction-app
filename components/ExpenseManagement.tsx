'use client';

import { useEffect, useState } from 'react';

interface Project {
  _id: string;
  name: string;
  vendors?: string[];
  contractors?: string[];
}

interface Vendor {
  _id: string;
  name: string;
  projectId: { _id: string; name: string };
}

interface Contractor {
  _id: string;
  name: string;
  projectId: { _id: string; name: string };
}

interface Expense {
  _id: string;
  projectId: { _id: string; name: string };
  vendorId?: { _id: string; name: string } | string;
  vendor?: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  mode: string;
  paidBy: string;
  materialDetails?: any;
  vendorPaymentStatus?: 'pending' | 'partial' | 'full';
  vendorPaidAmount?: number;
  laborDetails?: {
    laborType?: 'direct' | 'contractor';
    contractorId?: { _id: string; name: string } | string;
    contractorName?: string;
    teamName?: string;
    laborName?: string;
  };
  pettyCashDetails?: any;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
  };
  cashLocation?: string;
}

export default function ExpenseManagement() {
  const LEGACY_VENDOR_PREFIX = 'name:';
  const LEGACY_CONTRACTOR_PREFIX = 'cname:';
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [legacyVendors, setLegacyVendors] = useState<string[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [legacyContractors, setLegacyContractors] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [fetchError, setFetchError] = useState<string>('');

  const getObjectId = (value?: string | { _id: string; name?: string }) =>
    typeof value === 'string' ? value : value?._id || '';

  const getVendorName = (expense: Expense) => {
    if (expense.type !== 'material') return '-';
    if (expense.vendorId && typeof expense.vendorId !== 'string') return expense.vendorId.name;
    return expense.vendor || 'N/A';
  };

  const getContractorName = (expense: Expense) => {
    const contractorId = expense.laborDetails?.contractorId;
    if (contractorId && typeof contractorId !== 'string') return contractorId.name;
    if (expense.laborDetails?.contractorName) return expense.laborDetails.contractorName;
    if (typeof contractorId === 'string') return contractorId;
    return 'N/A';
  };

  const vendorOptions = [
    ...vendors.map((v) => ({ value: v._id, label: v.name })),
    ...legacyVendors
      .filter((name) => !vendors.some((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase()))
      .map((name) => ({ value: `${LEGACY_VENDOR_PREFIX}${name}`, label: name })),
  ];

  const contractorOptions = [
    ...contractors.map((c) => ({ value: c._id, label: c.name })),
    ...legacyContractors
      .filter((name) => !contractors.some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()))
      .map((name) => ({ value: `${LEGACY_CONTRACTOR_PREFIX}${name}`, label: name })),
  ];

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
              <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="factory-overhead">Factory Overhead</option>
                <option value="petty-cash">Petty Cash</option>
              </select>
            </div>
  */

  // ... (table implementation)

  // Update filter logic:
  /*
                {expenses
                  .filter((expense) => {
                      const projectMatch = filterProject === 'all' || expense.projectId?._id === filterProject;
                      const typeMatch = filterType === 'all' || expense.type === filterType;
                      return projectMatch && typeMatch;
                  })
                  .map((expense) => (
  */

  const [formData, setFormData] = useState({
    projectId: '',
    vendorId: '',
    type: 'material' as 'material' | 'labor' | 'factory-overhead' | 'petty-cash',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    mode: 'cash' as 'bank' | 'cash',
    paidBy: 'company' as 'customer' | 'company',
    bankName: '',
    accountNumber: '',
    cashLocation: 'locker1' as 'locker1' | 'locker2',
    materialName: '',
    materialQuantity: '',
    materialUnit: '',
    vendorPaymentStatus: 'pending' as 'pending' | 'partial' | 'full',
    partialPaidAmount: '',
    // Track payments by source
    paymentsBySource: {
      locker1: 0,
      locker2: 0,
      bank: 0,
    },
    laborType: 'direct' as 'direct' | 'contractor',
    contractorId: '',
    contractorName: '',
    teamName: '',
    laborName: '',
    supervisorName: '',
    pettySummary: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, []);

  // Fetch vendors when project changes
  useEffect(() => {
    const fetchVendors = async () => {
      if (formData.projectId) {
        const selectedProject = projects.find((p) => p._id === formData.projectId);
        const projectVendorNames = (selectedProject?.vendors || []).filter((v) => v.trim());

        try {
          const response = await fetch(`/api/vendors?projectId=${formData.projectId}&includeGeneral=true`);
          const data = await response.json();
          const vendorList = Array.isArray(data) ? data : [];
          setVendors(vendorList);
          setLegacyVendors(projectVendorNames);

          setFormData((prev) => {
            if (!prev.vendorId) return prev;
            const vendorExists = vendorList.some((v: Vendor) => v._id === prev.vendorId);
            const isLegacyVendor =
              prev.vendorId.startsWith(LEGACY_VENDOR_PREFIX) &&
              projectVendorNames.includes(prev.vendorId.slice(LEGACY_VENDOR_PREFIX.length));
            return vendorExists || isLegacyVendor ? prev : { ...prev, vendorId: '' };
          });
        } catch (error) {
          console.error('Error fetching vendors:', error);
          setVendors([]);
          setLegacyVendors(projectVendorNames);
        }
      } else {
        setVendors([]);
        setLegacyVendors([]);
        setFormData((prev) => (prev.vendorId ? { ...prev, vendorId: '' } : prev));
      }
    };
    fetchVendors();
  }, [formData.projectId, projects]);

  // Fetch contractors when project changes (for labor type)
  useEffect(() => {
    const fetchContractors = async () => {
      if (formData.projectId) {
        const selectedProject = projects.find((p) => p._id === formData.projectId);
        const projectContractorNames = (selectedProject?.contractors || []).filter((c) => c.trim());

        try {
          const response = await fetch(`/api/contractors?projectId=${formData.projectId}&includeGeneral=true`);
          const data = await response.json();
          const contractorList = Array.isArray(data) ? data : [];
          setContractors(contractorList);
          setLegacyContractors(projectContractorNames);
          setFormData((prev) => {
            if (!prev.contractorId) return prev;
            const contractorExists = contractorList.some((c: Contractor) => c._id === prev.contractorId);
            const isLegacyContractor =
              prev.contractorId.startsWith(LEGACY_CONTRACTOR_PREFIX) &&
              projectContractorNames.includes(prev.contractorId.slice(LEGACY_CONTRACTOR_PREFIX.length));
            return contractorExists || isLegacyContractor ? prev : { ...prev, contractorId: '' };
          });
        } catch (error) {
          console.error('Error fetching contractors:', error);
          setContractors([]);
          setLegacyContractors(projectContractorNames);
        }
      } else {
        setContractors([]);
        setLegacyContractors([]);
        setFormData((prev) => (prev.contractorId ? { ...prev, contractorId: '' } : prev));
      }
    };
    fetchContractors();
  }, [formData.projectId, projects]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();

      if (!response.ok) {
        setFetchError(data?.error || `Failed to load expenses (${response.status})`);
        setExpenses([]);
        return;
      }

      if (!Array.isArray(data)) {
        setFetchError('Unexpected response from expenses API');
        setExpenses([]);
        return;
      }

      setFetchError('');
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setFetchError('Unable to load expenses. Please refresh and try again.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const getExpenseEffectiveAmount = (expense: Expense) => {
    if (expense.type === 'material') {
      const status = expense.vendorPaymentStatus || 'pending';
      if (status === 'full' || status === 'partial') {
        const paid = typeof expense.vendorPaidAmount === 'number' ? expense.vendorPaidAmount : 0;
        return Math.max(0, Math.min(paid, expense.amount));
      }
      // pending: nothing actually paid yet
      return 0;
    }
    return expense.amount;
  };

  const handleEdit = (expense: Expense) => {
    const expenseVendorId = getObjectId(expense.vendorId);
    const selectedVendorValue = expenseVendorId || (expense.vendor ? `${LEGACY_VENDOR_PREFIX}${expense.vendor}` : '');
    const expenseContractorId = getObjectId(expense.laborDetails?.contractorId);
    const selectedContractorValue = expenseContractorId || (expense.laborDetails?.contractorName ? `${LEGACY_CONTRACTOR_PREFIX}${expense.laborDetails.contractorName}` : '');

    setEditingExpense(expense);
    setFormData({
      projectId: expense.projectId._id,
      vendorId: selectedVendorValue,
      type: expense.type as any,
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split('T')[0],
      description: expense.description,
      mode: expense.mode as any,
      paidBy: expense.paidBy as any,
      bankName: expense.bankDetails?.bankName || '',
      accountNumber: expense.bankDetails?.accountNumber || '',
      cashLocation: (expense.cashLocation as any) || 'locker1',
      materialName: expense.materialDetails?.materialName || '',
      materialQuantity: expense.materialDetails?.quantity?.toString() || '',
      materialUnit: expense.materialDetails?.unit || '',
      vendorPaymentStatus: (expense.vendorPaymentStatus as 'pending' | 'partial' | 'full') || 'pending',
      partialPaidAmount: expense.vendorPaymentStatus === 'partial' ? String(expense.vendorPaidAmount || '') : '',
      laborType: expense.laborDetails?.laborType || 'direct',
      contractorId: selectedContractorValue,
      contractorName: expense.laborDetails?.contractorName || '',
      teamName: expense.laborDetails?.teamName || '',
      laborName: expense.laborDetails?.laborName || '',
      supervisorName: expense.pettyCashDetails?.supervisorName || '',
      pettySummary: expense.pettyCashDetails?.summary || '',
      paymentsBySource: {
        locker1: 0,
        locker2: 0,
        bank: 0,
      },
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      projectId: '',
      vendorId: '',
      type: 'material',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      mode: 'cash',
      paidBy: 'company',
      bankName: '',
      accountNumber: '',
      cashLocation: 'locker1',
      materialName: '',
      materialQuantity: '',
      materialUnit: '',
      vendorPaymentStatus: 'pending',
      partialPaidAmount: '',
      laborType: 'direct',
      contractorId: '',
      contractorName: '',
      teamName: '',
      laborName: '',
      supervisorName: '',
      pettySummary: '',
      // Track payments by source
      paymentsBySource: {
        locker1: 0,
        locker2: 0,
        bank: 0,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedVendor = vendors.find((v) => v._id === formData.vendorId);
      const isLegacyVendor = formData.vendorId.startsWith(LEGACY_VENDOR_PREFIX);
      const legacyVendorName = isLegacyVendor ? formData.vendorId.slice(LEGACY_VENDOR_PREFIX.length) : '';
      const selectedContractor = contractors.find((c) => c._id === formData.contractorId);
      const isLegacyContractor = formData.contractorId.startsWith(LEGACY_CONTRACTOR_PREFIX);
      const legacyContractorName = isLegacyContractor ? formData.contractorId.slice(LEGACY_CONTRACTOR_PREFIX.length) : '';

      const expenseAmount = parseFloat(formData.amount) || 0;

      const payload: any = {
        projectId: formData.projectId,
        vendorId: formData.type === 'material' && formData.vendorId && !isLegacyVendor ? formData.vendorId : undefined,
        vendor: formData.type === 'material' ? (selectedVendor?.name || legacyVendorName || '') : '',
        type: formData.type,
        amount: expenseAmount,
        date: new Date(formData.date),
        description: formData.description,
        mode: formData.mode,
        paidBy: formData.paidBy,
      };

      if (formData.mode === 'bank') {
        payload.bankDetails = {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
        };
      } else {
        payload.cashLocation = formData.cashLocation;
      }

      if (formData.type === 'material') {
        if ((formData.vendorPaymentStatus === 'full' || formData.vendorPaymentStatus === 'partial') && (!formData.vendorId || isLegacyVendor)) {
          throw new Error('For full/partial payment, please select a registered vendor (not legacy name).');
        }
        if (formData.vendorPaymentStatus === 'partial') {
          const partialAmount = parseFloat(formData.partialPaidAmount) || 0;
          if (partialAmount <= 0 || partialAmount > expenseAmount) {
            throw new Error('Partial paid amount must be greater than 0 and less than or equal to total amount.');
          }
        }

        const normalizedPaidAmount =
          formData.vendorPaymentStatus === 'full'
            ? expenseAmount
            : formData.vendorPaymentStatus === 'partial'
              ? parseFloat(formData.partialPaidAmount) || 0
              : 0;

        payload.materialDetails = {
          materialName: formData.materialName,
          quantity: parseFloat(formData.materialQuantity) || 0,
          unit: formData.materialUnit,
        };
        payload.vendorPaymentStatus = formData.vendorPaymentStatus;
        payload.vendorPaidAmount = normalizedPaidAmount;
      } else if (formData.type === 'labor') {
        payload.laborDetails = {
          laborType: formData.laborType,
          contractorId: formData.laborType === 'contractor' && formData.contractorId && !isLegacyContractor ? formData.contractorId : undefined,
          contractorName: formData.laborType === 'contractor'
            ? (selectedContractor?.name || legacyContractorName || formData.contractorName || undefined)
            : (formData.contractorName || undefined),
          teamName: formData.teamName || undefined,
          laborName: formData.laborName || undefined,
        };
      } else if (formData.type === 'petty-cash') {
        payload.pettyCashDetails = {
          supervisorName: formData.supervisorName,
          summary: formData.pettySummary || undefined,
        };
      }

      if (editingExpense) {
        // Submit Edit Request
        const requestPayload = {
          collectionName: 'Expense',
          originalId: editingExpense._id,
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
        // Create New Expense
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create expense');
        }
      }

      resetForm();
      fetchExpenses();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = (Array.isArray(expenses) ? expenses : []).filter((expense) => {
    const projectMatch = filterProject === 'all' || expense.projectId?._id === filterProject;
    const typeMatch = filterType === 'all' || expense.type === filterType;
    return projectMatch && typeMatch;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + getExpenseEffectiveAmount(expense), 0);
  const totalRecords = Array.isArray(expenses) ? expenses.length : 0;
  const filteredRecords = filteredExpenses.length;

  if (loading && expenses.length === 0) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Add Expense
          </button>
        )}
      </div>

      {fetchError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
          {/* ... form content ... */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {editingExpense ? 'Request Edit for Expense' : 'Add New Expense'}
            </h2>
            {editingExpense && (
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
              <label className="block text-sm font-medium text-gray-700">Expense Type *</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.type}
                onChange={(e) => {
                  const nextType = e.target.value as typeof formData.type;
                  setFormData((prev) => ({
                    ...prev,
                    type: nextType,
                    vendorId: nextType === 'material' ? prev.vendorId : '',
                    vendorPaymentStatus: nextType === 'material' ? prev.vendorPaymentStatus : 'pending',
                    partialPaidAmount: nextType === 'material' ? prev.partialPaidAmount : '',
                  }));
                }}
              >
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="factory-overhead">Factory Overhead</option>
                <option value="petty-cash">Petty Cash</option>
              </select>
            </div>
            {formData.type === 'material' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  disabled={!formData.projectId || vendorOptions.length === 0}
                >
                  <option value="">{!formData.projectId ? 'Select Project First' : vendorOptions.length === 0 ? 'No Vendors' : 'Select Vendor'}</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.value} value={vendor.value}>{vendor.label}</option>
                  ))}
                </select>
              </div>
            )}
            {formData.type === 'labor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Labor Type *</label>
                  <div className="mt-2 flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        name="laborType"
                        value="direct"
                        checked={formData.laborType === 'direct'}
                        onChange={(e) => setFormData({ ...formData, laborType: 'direct', contractorId: '' })}
                      />
                      <span className="ml-2">Direct Labor</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        name="laborType"
                        value="contractor"
                        checked={formData.laborType === 'contractor'}
                        onChange={(e) => setFormData({ ...formData, laborType: 'contractor' })}
                      />
                      <span className="ml-2">Via Contractor</span>
                    </label>
                  </div>
                </div>
                {formData.laborType === 'contractor' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contractor *</label>
                    <select
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.contractorId}
                      onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
                      disabled={!formData.projectId || contractorOptions.length === 0}
                    >
                      <option value="">{!formData.projectId ? 'Select Project First' : contractorOptions.length === 0 ? 'No Contractors' : 'Select Contractor'}</option>
                      {contractorOptions.map((contractor) => (
                        <option key={contractor.value} value={contractor.value}>{contractor.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.laborType === 'direct' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Team Name</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.teamName}
                        onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Labor Name</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.laborName}
                        onChange={(e) => setFormData({ ...formData, laborName: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount *
                {editingExpense && (
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (Original: {editingExpense.amount})
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
              <label className="block text-sm font-medium text-gray-700">Payment Source *</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.mode}
                onChange={(e) => {
                  const newMode = e.target.value as 'bank' | 'cash';
                  setFormData({
                    ...formData,
                    mode: newMode,
                    bankName: '',
                    accountNumber: '',
                    paymentsBySource: {
                      locker1: newMode === 'cash' && formData.cashLocation === 'locker1' && formData.amount ? parseFloat(formData.amount) : 0,
                      locker2: newMode === 'cash' && formData.cashLocation === 'locker2' && formData.amount ? parseFloat(formData.amount) : 0,
                      bank: newMode === 'bank' && formData.amount ? parseFloat(formData.amount) : 0,
                    }
                  });
                }}
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {formData.mode === 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cash Location *</label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.cashLocation}
                  onChange={(e) => setFormData({
                    ...formData,
                    cashLocation: e.target.value as 'locker1' | 'locker2',
                    paymentsBySource: {
                      ...formData.paymentsBySource,
                      locker1: e.target.value === 'locker1' && formData.amount ? parseFloat(formData.amount) : 0,
                      locker2: e.target.value === 'locker2' && formData.amount ? parseFloat(formData.amount) : 0,
                    }
                  })}
                >
                  <option value="locker1">Locker 1</option>
                  <option value="locker2">Locker 2</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Paid By *</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.paidBy}
                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value as 'customer' | 'company' })}
              >
                <option value="customer">Customer</option>
                <option value="company">Company</option>
              </select>
            </div>
            {formData.mode === 'bank' && (
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
            )}
          </div>

          {formData.type === 'material' && (
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Material Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  step="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.materialQuantity}
                  onChange={(e) => setFormData({ ...formData, materialQuantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.materialUnit}
                  onChange={(e) => setFormData({ ...formData, materialUnit: e.target.value })}
                >
                  <option value="">Select Unit</option>
                  <option value="Bags">Bags</option>
                  <option value="Kg">Kg</option>
                  <option value="Tons">Tons</option>
                  <option value="Pieces">Pieces</option>
                  <option value="Liters">Liters</option>
                  <option value="Truck">Truck</option>
                  <option value="Trali">Trali</option>
                  <option value="Dumper">Dumper</option>
                  <option value="Rickshaw">Rickshaw</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700">Vendor Payment Status</label>
                <div className="mt-2 flex flex-wrap gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-indigo-600"
                      name="vendorPaymentStatus"
                      value="full"
                      checked={formData.vendorPaymentStatus === 'full'}
                      onChange={() => setFormData({ ...formData, vendorPaymentStatus: 'full', partialPaidAmount: '' })}
                    />
                    <span className="ml-2">Full Paid</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-indigo-600"
                      name="vendorPaymentStatus"
                      value="partial"
                      checked={formData.vendorPaymentStatus === 'partial'}
                      onChange={() => setFormData({ ...formData, vendorPaymentStatus: 'partial' })}
                    />
                    <span className="ml-2">Partial</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-indigo-600"
                      name="vendorPaymentStatus"
                      value="pending"
                      checked={formData.vendorPaymentStatus === 'pending'}
                      onChange={() => setFormData({ ...formData, vendorPaymentStatus: 'pending', partialPaidAmount: '' })}
                    />
                    <span className="ml-2">Pending</span>
                  </label>
                </div>
              </div>
              {formData.vendorPaymentStatus === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Partial Paid Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.partialPaidAmount}
                    onChange={(e) => setFormData({ ...formData, partialPaidAmount: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}


          {formData.type === 'petty-cash' && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Supervisor Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.supervisorName}
                  onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Summary</label>
                <textarea
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={formData.pettySummary}
                  onChange={(e) => setFormData({ ...formData, pettySummary: e.target.value })}
                />
              </div>
            </div>
          )}

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
              className={`px-4 py-2 text-white rounded-md ${editingExpense ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
            >
              {loading ? 'Submitting...' : editingExpense ? 'Request Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">All Expenses</h2>
            {/* Enhanced Total Amount Display */}
            <div className="inline-flex items-baseline px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100">
              <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide mr-2">Total</span>
              <span className="text-lg font-bold text-indigo-700">Rs {totalAmount.toLocaleString()}</span>
            </div>
            <div className="inline-flex items-baseline px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-2">Records</span>
              <span className="text-sm font-semibold text-slate-700">
                {filteredRecords}
                {filteredRecords !== totalRecords ? ` / ${totalRecords}` : ''}
              </span>
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
              <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="factory-overhead">Factory Overhead</option>
                <option value="petty-cash">Petty Cash</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses
                .map((expense) => (
                  <tr key={expense._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.projectId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.type.replace('-', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      Rs {getExpenseEffectiveAmount(expense).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.mode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.paidBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingExpense(expense)}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(expense)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    No expense records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expense Details</h3>
              <button
                onClick={() => setViewingExpense(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium text-gray-700">Date:</span> {new Date(viewingExpense.date).toLocaleDateString()}</p>
                  <p><span className="font-medium text-gray-700">Project:</span> {viewingExpense.projectId?.name || 'N/A'}</p>
                  <p><span className="font-medium text-gray-700">Type:</span> {viewingExpense.type.replace('-', ' ')}</p>
                  <p><span className="font-medium text-gray-700">Amount:</span> Rs {viewingExpense.amount.toLocaleString()}</p>
                  <p><span className="font-medium text-gray-700">Paid By:</span> {viewingExpense.paidBy}</p>
                  <p><span className="font-medium text-gray-700">Mode:</span> {viewingExpense.mode}</p>
                </div>
                <p className="text-sm mt-3">
                  <span className="font-medium text-gray-700">Description:</span> {viewingExpense.description || 'N/A'}
                </p>
              </div>

              {viewingExpense.mode === 'bank' ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Bank Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Bank Name:</span> {viewingExpense.bankDetails?.bankName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Account Number:</span> {viewingExpense.bankDetails?.accountNumber || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Cash Details</h4>
                  <p className="text-sm"><span className="font-medium text-gray-700">Location:</span> {viewingExpense.cashLocation || 'N/A'}</p>
                </div>
              )}

              {viewingExpense.type === 'material' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Material Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Vendor:</span> {getVendorName(viewingExpense)}</p>
                    <p><span className="font-medium text-gray-700">Payment Status:</span> {viewingExpense.vendorPaymentStatus || 'pending'}</p>
                    <p><span className="font-medium text-gray-700">Paid:</span> Rs {(viewingExpense.vendorPaidAmount || 0).toLocaleString()}</p>
                    <p><span className="font-medium text-gray-700">Remaining:</span> Rs {Math.max(0, (viewingExpense.amount || 0) - (viewingExpense.vendorPaidAmount || 0)).toLocaleString()}</p>
                    <p><span className="font-medium text-gray-700">Material:</span> {viewingExpense.materialDetails?.materialName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Quantity:</span> {viewingExpense.materialDetails?.quantity ?? 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Unit:</span> {viewingExpense.materialDetails?.unit || 'N/A'}</p>
                  </div>
                </div>
              )}

              {viewingExpense.type === 'labor' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Labor Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                    <p><span className="font-medium text-gray-700">Labor Type:</span> {viewingExpense.laborDetails?.laborType || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Contractor:</span> {getContractorName(viewingExpense)}</p>
                    <p><span className="font-medium text-gray-700">Team:</span> {viewingExpense.laborDetails?.teamName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Labor:</span> {viewingExpense.laborDetails?.laborName || 'N/A'}</p>
                  </div>
                </div>
              )}

              {viewingExpense.type === 'petty-cash' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Petty Cash Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Supervisor:</span> {viewingExpense.pettyCashDetails?.supervisorName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">Summary:</span> {viewingExpense.pettyCashDetails?.summary || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
