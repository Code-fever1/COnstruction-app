'use client';

import { useEffect, useState } from 'react';

interface Project {
    _id: string;
    name: string;
    vendors?: string[];
}

interface Vendor {
    _id: string;
    projectId?: { _id: string; name: string } | null;
    name: string;
    phone?: string;
    address?: string;
    totalPurchased: number;
    totalPaid: number;
    balance: number;
    status: 'active' | 'settled';
}

interface VendorPayment {
    _id: string;
    vendorId: { _id: string; name: string };
    amount: number;
    date: string;
    description: string;
    mode: string;
}

interface VendorDetail extends Vendor {
    expenses: any[];
    payments: VendorPayment[];
}

export default function VendorManagement() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [nameFilter, setNameFilter] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<VendorDetail | null>(null);
    const [showVendorForm, setShowVendorForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [projectVendorOptions, setProjectVendorOptions] = useState<string[]>([]);
    const [vendorEntryType, setVendorEntryType] = useState<'project' | 'general'>('project');

    const [vendorFormData, setVendorFormData] = useState({
        projectId: '',
        name: '',
        phone: '',
        address: '',
    });

    const [paymentFormData, setPaymentFormData] = useState({
        vendorId: '',
        projectId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        mode: 'cash' as 'bank' | 'cash',
        bankName: '',
        accountNumber: '',
        cashLocation: 'locker1' as 'locker1' | 'locker2',
    });
    const [editFormData, setEditFormData] = useState({
        vendorId: '',
        projectId: '',
        name: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        fetchProjects();
        fetchVendors();
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [selectedProject]);

    useEffect(() => {
        const fetchProjectVendors = async () => {
            if (vendorEntryType === 'general' || !vendorFormData.projectId) {
                setProjectVendorOptions([]);
                return;
            }

            const selectedProjectData = projects.find((project) => project._id === vendorFormData.projectId);
            const projectVendorNames = (selectedProjectData?.vendors || [])
                .map((name) => name.trim())
                .filter(Boolean);

            try {
                const response = await fetch(`/api/vendors?projectId=${vendorFormData.projectId}`);
                const data = await response.json();

                const dbVendorNames = Array.isArray(data)
                    ? data
                        .map((vendor: Vendor) => vendor?.name?.trim())
                        .filter(Boolean)
                    : [];

                setProjectVendorOptions(Array.from(new Set([...projectVendorNames, ...dbVendorNames])));
            } catch (error) {
                console.error('Error fetching project vendors:', error);
                setProjectVendorOptions(Array.from(new Set(projectVendorNames)));
            }
        };

        fetchProjectVendors();
    }, [vendorEntryType, vendorFormData.projectId, projects]);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const url = selectedProject === 'all'
                ? '/api/vendors'
                : `/api/vendors?projectId=${selectedProject}`;
            const response = await fetch(url);
            const data = await response.json();
            setVendors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorDetails = async (vendorId: string) => {
        try {
            const response = await fetch(`/api/vendors/${vendorId}`);
            const data = await response.json();
            setSelectedVendor(data);
        } catch (error) {
            console.error('Error fetching vendor details:', error);
        }
    };

    const handleVendorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const trimmedName = vendorFormData.name.trim();
            const trimmedPhone = vendorFormData.phone.trim();

            if (!trimmedName || !trimmedPhone) {
                throw new Error('Vendor name and phone are required');
            }
            if (vendorEntryType === 'project' && !vendorFormData.projectId) {
                throw new Error('Project is required for project-linked vendor');
            }

            const payload: Record<string, unknown> = {
                name: trimmedName,
                phone: trimmedPhone,
                address: vendorFormData.address.trim(),
            };
            if (vendorEntryType === 'project') {
                payload.projectId = vendorFormData.projectId;
            }

            const response = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create vendor');
            }

            setShowVendorForm(false);
            setVendorEntryType('project');
            setVendorFormData({ projectId: '', name: '', phone: '', address: '' });
            fetchVendors();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                vendorId: paymentFormData.vendorId,
                projectId: paymentFormData.projectId,
                amount: parseFloat(paymentFormData.amount),
                date: new Date(paymentFormData.date),
                description: paymentFormData.description,
                mode: paymentFormData.mode,
            };

            if (paymentFormData.mode === 'bank') {
                payload.bankDetails = {
                    bankName: paymentFormData.bankName,
                    accountNumber: paymentFormData.accountNumber,
                };
            } else {
                payload.cashLocation = paymentFormData.cashLocation;
            }

            const response = await fetch('/api/vendor-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to record payment');
            }

            setShowPaymentForm(false);
            setPaymentFormData({
                vendorId: '',
                projectId: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                mode: 'cash',
                bankName: '',
                accountNumber: '',
                cashLocation: 'locker1',
            });
            fetchVendors();
            if (selectedVendor) {
                fetchVendorDetails(selectedVendor._id);
            }
        } catch (error: any) {
            alert(error.message);
        }
    };

    const openPaymentForm = (vendor: Vendor) => {
        setPaymentFormData({
            ...paymentFormData,
            vendorId: vendor._id,
            projectId: vendor.projectId?._id || '',
        });
        setShowPaymentForm(true);
    };

    const openEditForm = (vendor: Vendor) => {
        setEditFormData({
            vendorId: vendor._id,
            projectId: vendor.projectId?._id || '',
            name: vendor.name || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
        });
        setShowEditForm(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: Record<string, unknown> = {
                name: editFormData.name.trim(),
                phone: editFormData.phone.trim(),
                address: editFormData.address.trim(),
            };
            if (editFormData.projectId) {
                payload.projectId = editFormData.projectId;
            } else {
                payload.projectId = null;
            }

            const response = await fetch(`/api/vendors/${editFormData.vendorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update vendor');
            }

            setShowEditForm(false);
            setEditFormData({ vendorId: '', projectId: '', name: '', phone: '', address: '' });
            fetchVendors();
            if (selectedVendor && selectedVendor._id === editFormData.vendorId) {
                fetchVendorDetails(editFormData.vendorId);
            }
        } catch (error: any) {
            alert(error.message);
        }
    };

    const totalBalance = vendors.reduce((sum, v) => sum + v.balance, 0);
    const totalPurchased = vendors.reduce((sum, v) => sum + v.totalPurchased, 0);
    const totalPaid = vendors.reduce((sum, v) => sum + v.totalPaid, 0);

    if (loading && vendors.length === 0) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
                <button
                    onClick={() => setShowVendorForm(!showVendorForm)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                    {showVendorForm ? 'Cancel' : 'Add Vendor'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Purchases</h3>
                    <p className="text-3xl font-bold text-indigo-600">Rs {totalPurchased.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Paid</h3>
                    <p className="text-3xl font-bold text-green-600">Rs {totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Outstanding Balance</h3>
                    <p className={`text-3xl font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs {totalBalance.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Add Vendor Form */}
            {showVendorForm && (
                <form onSubmit={handleVendorSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Vendor</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Entry Type</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={vendorEntryType}
                                onChange={(e) => {
                                    const nextType = e.target.value as 'project' | 'general';
                                    setVendorEntryType(nextType);
                                    if (nextType === 'general') {
                                        setVendorFormData((prev) => ({ ...prev, projectId: '' }));
                                    }
                                }}
                            >
                                <option value="project">Project Linked</option>
                                <option value="general">New Vendor (No Project)</option>
                            </select>
                        </div>
                        {vendorEntryType === 'project' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Project *</label>
                                <select
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    value={vendorFormData.projectId}
                                    onChange={(e) => setVendorFormData({ ...vendorFormData, projectId: e.target.value })}
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
                        {vendorEntryType === 'project' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Existing Vendor</label>
                                <select
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    value={projectVendorOptions.includes(vendorFormData.name) ? vendorFormData.name : ''}
                                    onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                                    disabled={!vendorFormData.projectId || projectVendorOptions.length === 0}
                                >
                                    <option value="">
                                        {!vendorFormData.projectId
                                            ? 'Select Project First'
                                            : projectVendorOptions.length === 0
                                                ? 'No Vendors in Project'
                                                : 'Select Vendor'}
                                    </option>
                                    {projectVendorOptions.map((vendorName) => (
                                        <option key={`${vendorFormData.projectId}-${vendorName}`} value={vendorName}>
                                            {vendorName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vendor Name *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={
                                    vendorEntryType === 'project' && !vendorFormData.projectId
                                        ? 'Select project first'
                                        : vendorEntryType === 'project' && projectVendorOptions.length > 0
                                            ? 'Select above or type new vendor'
                                            : 'Type vendor name'
                                }
                                value={vendorFormData.name}
                                onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={vendorFormData.phone}
                                onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={vendorFormData.address}
                                onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Add Vendor
                        </button>
                    </div>
                </form>
            )}

            {showEditForm && (
                <form onSubmit={handleEditSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Edit Vendor</h2>
                        <button
                            type="button"
                            onClick={() => setShowEditForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Close
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Project</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={editFormData.projectId}
                                onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                            >
                                <option value="">General (No Project)</option>
                                {projects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vendor Name *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={editFormData.address}
                                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700"
                        >
                            Update Vendor
                        </button>
                    </div>
                </form>
            )}

            {/* Record Payment Form */}
            {showPaymentForm && (
                <form onSubmit={handlePaymentSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Record Payment</h2>
                        <button
                            type="button"
                            onClick={() => setShowPaymentForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount *</label>
                            <input
                                type="number"
                                required
                                step="1"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={paymentFormData.amount}
                                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date *</label>
                            <input
                                type="date"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={paymentFormData.date}
                                onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Description *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={paymentFormData.description}
                                onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Mode *</label>
                            <select
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={paymentFormData.mode}
                                onChange={(e) => setPaymentFormData({ ...paymentFormData, mode: e.target.value as 'bank' | 'cash' })}
                            >
                                <option value="bank">Bank</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                        {paymentFormData.mode === 'bank' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={paymentFormData.bankName}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, bankName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={paymentFormData.accountNumber}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, accountNumber: e.target.value })}
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cash Location</label>
                                <select
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    value={paymentFormData.cashLocation}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, cashLocation: e.target.value as 'locker1' | 'locker2' })}
                                >
                                    <option value="locker1">Locker 1</option>
                                    <option value="locker2">Locker 2</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                        >
                            Record Payment
                        </button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Vendors</h2>
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

                {/* Vendors Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {vendors
                                .filter((v) => v.name.toLowerCase().includes(nameFilter.toLowerCase()))
                                .length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        No vendors found. Add your first vendor!
                                    </td>
                                </tr>
                            ) : (
                                vendors
                                    .filter((v) => v.name.toLowerCase().includes(nameFilter.toLowerCase()))
                                    .map((vendor) => (
                                        <tr key={vendor._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {vendor.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {vendor.projectId?.name || 'General'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {vendor.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                                                Rs {vendor.totalPurchased.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                Rs {vendor.totalPaid.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${vendor.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    Rs {vendor.balance.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => fetchVendorDetails(vendor._id)}
                                                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => openEditForm(vendor)}
                                                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openPaymentForm(vendor)}
                                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                                                    >
                                                        Pay
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

            {/* Vendor Detail Modal */}
            {selectedVendor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedVendor.name}</h2>
                                <p className="text-sm text-gray-500">{selectedVendor.projectId?.name || 'General'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedVendor(null)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Vendor Summary */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <p className="text-sm text-indigo-600 font-medium">Total Purchases</p>
                                    <p className="text-2xl font-bold text-indigo-700">Rs {selectedVendor.totalPurchased.toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-700">Rs {selectedVendor.totalPaid.toLocaleString()}</p>
                                </div>
                                <div className={`p-4 rounded-lg ${selectedVendor.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                    <p className={`text-sm font-medium ${selectedVendor.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Outstanding Balance
                                    </p>
                                    <p className={`text-2xl font-bold ${selectedVendor.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        Rs {selectedVendor.balance.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            {(selectedVendor.phone || selectedVendor.address) && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium text-gray-900 mb-2">Contact Info</h3>
                                    {selectedVendor.phone && <p className="text-sm text-gray-600">Phone: {selectedVendor.phone}</p>}
                                    {selectedVendor.address && <p className="text-sm text-gray-600">Address: {selectedVendor.address}</p>}
                                </div>
                            )}

                            {/* Expenses (Purchases) */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-900 mb-3">Purchases ({selectedVendor.expenses?.length || 0})</h3>
                                {selectedVendor.expenses && selectedVendor.expenses.length > 0 ? (
                                    <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedVendor.expenses.map((expense: any) => (
                                                    <tr key={expense._id}>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {new Date(expense.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{expense.description}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-700 capitalize">
                                                            {expense.vendorPaymentStatus || 'pending'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-green-600 font-medium">
                                                            Rs {(expense.vendorPaidAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-red-600 font-medium">
                                                            Rs {Math.max(0, (expense.amount || 0) - (expense.vendorPaidAmount || 0)).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-medium text-indigo-600">
                                                            Rs {expense.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No purchases recorded yet.</p>
                                )}
                            </div>

                            {/* Payments */}
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">Payments ({selectedVendor.payments?.length || 0})</h3>
                                {selectedVendor.payments && selectedVendor.payments.length > 0 ? (
                                    <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedVendor.payments.map((payment: VendorPayment) => (
                                                    <tr key={payment._id}>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {new Date(payment.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{payment.description}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{payment.mode}</td>
                                                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                                                            Rs {payment.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No payments recorded yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
