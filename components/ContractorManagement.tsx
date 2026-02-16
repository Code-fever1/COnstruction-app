'use client';

import { useEffect, useState } from 'react';

interface Project {
    _id: string;
    name: string;
    contractors?: string[];
}

interface Expense {
    _id: string;
    amount: number;
    date: string;
    description: string;
    projectId: { _id: string; name: string };
}

interface Contractor {
    _id: string;
    projectId?: { _id: string; name: string } | null;
    name: string;
    phone?: string;
    area?: number | null;
    rate?: number | null;
    agreedAmount: number;
    totalPaid: number;
    balance: number;
    status: 'active' | 'completed';
}

interface ContractorDetail extends Contractor {
    expenses: Expense[];
}

export default function ContractorManagement() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [nameFilter, setNameFilter] = useState('');
    const [selectedContractor, setSelectedContractor] = useState<ContractorDetail | null>(null);
    const [showContractorForm, setShowContractorForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [projectContractorOptions, setProjectContractorOptions] = useState<string[]>([]);
    const [contractorEntryType, setContractorEntryType] = useState<'project' | 'general'>('project');

    const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);

    const [formData, setFormData] = useState({
        projectId: '',
        name: '',
        phone: '',
        area: '',
        rate: '',
        agreedAmount: '',
    });

    useEffect(() => {
        fetchProjects();
        fetchContractors();
    }, []);

    useEffect(() => {
        fetchContractors();
    }, [selectedProject]);

    useEffect(() => {
        const fetchProjectContractors = async () => {
            if (contractorEntryType === 'general' || !formData.projectId) {
                setProjectContractorOptions([]);
                return;
            }

            const selectedProjectData = projects.find((project) => project._id === formData.projectId);
            const projectContractorNames = (selectedProjectData?.contractors || [])
                .map((name) => name.trim())
                .filter(Boolean);

            try {
                const response = await fetch(`/api/contractors?projectId=${formData.projectId}`);
                const data = await response.json();

                const dbContractorNames = Array.isArray(data)
                    ? data
                        .map((contractor: Contractor) => contractor?.name?.trim())
                        .filter(Boolean)
                    : [];

                setProjectContractorOptions(Array.from(new Set([...projectContractorNames, ...dbContractorNames])));
            } catch (error) {
                console.error('Error fetching project contractors:', error);
                setProjectContractorOptions(Array.from(new Set(projectContractorNames)));
            }
        };

        fetchProjectContractors();
    }, [contractorEntryType, formData.projectId, projects]);

    // Auto-calculate agreed amount when area or rate changes
    useEffect(() => {
        const area = parseFloat(formData.area) || 0;
        const rate = parseFloat(formData.rate) || 0;
        if (area && rate) {
            setFormData(prev => ({ ...prev, agreedAmount: (area * rate).toString() }));
        }
    }, [formData.area, formData.rate]);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchContractors = async () => {
        try {
            const url = selectedProject === 'all'
                ? '/api/contractors'
                : `/api/contractors?projectId=${selectedProject}`;
            const response = await fetch(url);
            const data = await response.json();
            setContractors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching contractors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchContractorDetails = async (id: string) => {
        try {
            const response = await fetch(`/api/contractors/${id}`);
            const data = await response.json();
            setSelectedContractor(data);
        } catch (error) {
            console.error('Error fetching contractor details:', error);
        }
    };

    const handleEdit = (contractor: Contractor) => {
        setEditingContractor(contractor);
        setFormData({
            projectId: contractor.projectId?._id || '',
            name: contractor.name,
            phone: contractor.phone || '',
            area: contractor.area?.toString() || '',
            rate: contractor.rate?.toString() || '',
            agreedAmount: contractor.agreedAmount.toString(),
        });
        setContractorEntryType(contractor.projectId ? 'project' : 'general');
        setShowContractorForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setFormData({ projectId: '', name: '', phone: '', area: '', rate: '', agreedAmount: '' });
        setEditingContractor(null);
        setContractorEntryType('project');
        setShowContractorForm(false);
    };

    const handleAddContractor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const trimmedName = formData.name.trim();
            const trimmedPhone = formData.phone.trim();
            const amount = parseFloat(formData.agreedAmount) || 0;

            if (!trimmedName) {
                throw new Error('Contractor name is required');
            }

            if (contractorEntryType === 'project' && !formData.projectId) {
                throw new Error('Project is required for project-linked contractor');
            }

            const payload: any = {
                name: trimmedName,
                phone: trimmedPhone,
                agreedAmount: amount,
            };

            if (contractorEntryType === 'project') {
                payload.projectId = formData.projectId;
            }

            if (editingContractor) {
                // Submit Edit Request
                const requestPayload = {
                    collectionName: 'Contractor',
                    originalId: editingContractor._id,
                    newData: payload,
                    projectId: formData.projectId || editingContractor.projectId?._id,
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
                // Create New Contractor
                const response = await fetch('/api/contractors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error);
                }
            }

            resetForm();
            fetchContractors();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const totalAgreed = contractors.reduce((sum, c) => sum + c.agreedAmount, 0);
    const totalPaid = contractors.reduce((sum, c) => sum + c.totalPaid, 0);
    const totalBalance = contractors.reduce((sum, c) => sum + c.balance, 0);

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Contractor Management</h1>
                {!showContractorForm && (
                    <button
                        onClick={() => setShowContractorForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Add Contractor
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Agreed Amount</h3>
                    <p className="text-3xl font-bold text-blue-600">Rs {totalAgreed.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Paid</h3>
                    <p className="text-3xl font-bold text-green-600">Rs {totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Outstanding Balance</h3>
                    <p className="text-3xl font-bold text-red-600">Rs {totalBalance.toLocaleString()}</p>
                </div>
            </div>

            {showContractorForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <div className="border-b pb-4 mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingContractor ? 'Request Edit for Contractor' : 'Add New Contractor'}
                        </h2>
                        {editingContractor && (
                            <p className="text-sm text-yellow-600 mt-1">
                                Note: Edits will be submitted as a request and must be approved by the owner.
                            </p>
                        )}
                    </div>
                    <form onSubmit={handleAddContractor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Entry Type</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={contractorEntryType}
                                onChange={(e) => {
                                    const nextType = e.target.value as 'project' | 'general';
                                    setContractorEntryType(nextType);
                                    if (nextType === 'general') {
                                        setFormData((prev) => ({ ...prev, projectId: '' }));
                                    }
                                }}
                            >
                                <option value="project">Project Linked</option>
                                <option value="general">New Contractor (No Project)</option>
                            </select>
                        </div>
                        {contractorEntryType === 'project' && (
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
                        )}
                        {contractorEntryType === 'project' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Existing Contractor</label>
                                <select
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    value={projectContractorOptions.includes(formData.name) ? formData.name : ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={!formData.projectId || projectContractorOptions.length === 0}
                                >
                                    <option value="">
                                        {!formData.projectId
                                            ? 'Select Project First'
                                            : projectContractorOptions.length === 0
                                                ? 'No Contractors in Project'
                                                : 'Select Contractor'}
                                    </option>
                                    {projectContractorOptions.map((contractorName) => (
                                        <option key={`${formData.projectId}-${contractorName}`} value={contractorName}>
                                            {contractorName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contractor Name *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={
                                    contractorEntryType === 'project' && projectContractorOptions.length > 0
                                        ? 'Select above or type new contractor'
                                        : 'Type contractor name'
                                }
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Area (sq ft/m)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                placeholder="Enter area"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rate (per sq ft/m)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                placeholder="Enter rate"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Agreed Amount (Calculated)</label>
                            <input
                                type="number"
                                step="1"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                value={formData.agreedAmount}
                                readOnly
                                placeholder="Auto-calculated from area × rate"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${editingContractor ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-md`}
                            >
                                {editingContractor ? 'Request Update' : 'Add Contractor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Contractors</h2>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Search:</label>
                            <input
                                type="text"
                                placeholder="Filter by name..."
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                value={nameFilter}
                                onChange={(e) => setNameFilter(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
                            <select
                                className="px-3 py-2 border border-gray-300 rounded-md"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
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
                </div>

                {/* Contractors Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Contractor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Project
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Phone
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Agreed Amount
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Paid
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {contractors
                                .filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()))
                                .length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                        No contractors found
                                    </td>
                                </tr>
                            ) : (
                                contractors
                                    .filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()))
                                    .map((contractor) => (
                                        <tr key={contractor._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {contractor.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {contractor.projectId?.name || 'General'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {contractor.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 font-medium">
                                                Rs {contractor.agreedAmount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-medium">
                                                Rs {contractor.totalPaid.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-medium">
                                                Rs {contractor.balance.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${contractor.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                >
                                                    {contractor.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => fetchContractorDetails(contractor._id)}
                                                    className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors mr-2"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(contractor)}
                                                    className="px-3 py-1 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Contractor Detail Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedContractor.name}</h2>
                                    <p className="text-gray-500">{selectedContractor.projectId?.name || 'General'}</p>
                                    {selectedContractor.phone && (
                                        <p className="text-gray-500">Phone: {selectedContractor.phone}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedContractor(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">Agreed Amount</p>
                                    <p className="text-2xl font-bold text-blue-700">
                                        Rs {selectedContractor.agreedAmount.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-700">
                                        Rs {selectedContractor.totalPaid.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <p className="text-sm text-red-600 font-medium">Remaining Balance</p>
                                    <p className="text-2xl font-bold text-red-700">
                                        Rs {selectedContractor.balance.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Payment History (from labor expenses) */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Payment History (Labor Expenses)</h3>
                                {selectedContractor.expenses?.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Date
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Description
                                                </th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedContractor.expenses?.map((expense) => (
                                                <tr key={expense._id}>
                                                    <td className="px-4 py-2 text-sm text-gray-500">
                                                        {new Date(expense.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">
                                                        {expense.description}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-right text-green-600 font-medium">
                                                        Rs {expense.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
