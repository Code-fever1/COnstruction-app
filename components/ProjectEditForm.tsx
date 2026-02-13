'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProjectFormProps {
    projectId?: string;
}

export default function ProjectEditForm({ projectId }: ProjectFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!projectId);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [error, setError] = useState('');
    const [contractorOptions, setContractorOptions] = useState<string[]>([]);
    const [vendorOptions, setVendorOptions] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        type: 'customer' as 'customer' | 'company' | 'investor',
        customerName: '',
        investorPercentage: { customer: 50, company: 50 },
        agreement: {
            totalAmount: '',
            startDate: '',
            endDate: '',
            description: '',
        },
        supervisor: '',
        contractors: [] as string[],
        vendors: [] as string[],
        status: 'active' as 'active' | 'completed' | 'on-hold',
    });

    useEffect(() => {
        fetchOptions();
        if (projectId) {
            fetchProject();
        }
    }, [projectId]);

    const fetchOptions = async () => {
        try {
            const [projectsResponse, contractorsResponse, vendorsResponse] = await Promise.all([
                fetch('/api/projects'),
                fetch('/api/contractors'),
                fetch('/api/vendors'),
            ]);

            const [projectsData, contractorsData, vendorsData] = await Promise.all([
                projectsResponse.json(),
                contractorsResponse.json(),
                vendorsResponse.json(),
            ]);

            const normalizeNames = (names: string[]) =>
                Array.from(
                    new Set(
                        names
                            .map((name) => name?.trim())
                            .filter((name): name is string => Boolean(name))
                    )
                ).sort((a, b) => a.localeCompare(b));

            const projectContractorNames = Array.isArray(projectsData)
                ? projectsData.flatMap((project: any) => (Array.isArray(project.contractors) ? project.contractors : []))
                : [];
            const projectVendorNames = Array.isArray(projectsData)
                ? projectsData.flatMap((project: any) => (Array.isArray(project.vendors) ? project.vendors : []))
                : [];

            const apiContractorNames = Array.isArray(contractorsData)
                ? contractorsData.map((contractor: any) => contractor?.name || '')
                : [];
            const apiVendorNames = Array.isArray(vendorsData)
                ? vendorsData.map((vendor: any) => vendor?.name || '')
                : [];

            setContractorOptions(normalizeNames([...projectContractorNames, ...apiContractorNames]));
            setVendorOptions(normalizeNames([...projectVendorNames, ...apiVendorNames]));
        } catch (fetchError) {
            console.error('Error loading contractor/vendor options:', fetchError);
            setContractorOptions([]);
            setVendorOptions([]);
        } finally {
            setOptionsLoading(false);
        }
    };

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch project');
            }
            const data = await response.json();

            setFormData({
                name: data.name || '',
                type: data.type || 'customer',
                customerName: data.customerName || '',
                investorPercentage: data.investorPercentage || { customer: 50, company: 50 },
                agreement: {
                    totalAmount: data.agreement?.totalAmount?.toString() || '',
                    startDate: data.agreement?.startDate ? new Date(data.agreement.startDate).toISOString().split('T')[0] : '',
                    endDate: data.agreement?.endDate ? new Date(data.agreement.endDate).toISOString().split('T')[0] : '',
                    description: data.agreement?.description || '',
                },
                supervisor: data.supervisor || '',
                contractors: data.contractors?.length > 0 ? data.contractors : [],
                vendors: data.vendors?.length > 0 ? data.vendors : [],
                status: data.status || 'active',
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload: any = {
                name: formData.name,
                type: formData.type,
                agreement: {
                    totalAmount: parseFloat(formData.agreement.totalAmount),
                    startDate: new Date(formData.agreement.startDate),
                    endDate: new Date(formData.agreement.endDate),
                    description: formData.agreement.description,
                },
                status: formData.status,
            };

            if (formData.type === 'customer' || formData.type === 'investor') {
                payload.customerName = formData.customerName;
            }

            if (formData.type === 'investor') {
                payload.investorPercentage = formData.investorPercentage;
            }

            if (formData.supervisor) {
                payload.supervisor = formData.supervisor;
            }

            if (formData.contractors.filter((c) => c.trim()).length > 0) {
                payload.contractors = formData.contractors.filter((c) => c.trim());
            }

            if (formData.vendors.filter((v) => v.trim()).length > 0) {
                payload.vendors = formData.vendors.filter((v) => v.trim());
            }

            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update project');
            }

            router.push('/dashboard/owner');
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="text-center py-8">Loading project data...</div>;
    }

    const contractorSelectOptions = Array.from(
        new Set([...contractorOptions, ...formData.contractors.map((contractor) => contractor.trim()).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b));
    const vendorSelectOptions = Array.from(
        new Set([...vendorOptions, ...formData.vendors.map((vendor) => vendor.trim()).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b));

    return (
        <div>
            <div className="mb-6">
                <Link
                    href="/dashboard/owner"
                    className="text-indigo-600 hover:text-indigo-500 mb-4 inline-block"
                >
                    ← Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Edit Project</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Project Type *</label>
                    <select
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.type}
                        onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value as 'customer' | 'company' | 'investor' })
                        }
                    >
                        <option value="customer">Customer</option>
                        <option value="company">Company</option>
                        <option value="investor">Investor</option>
                    </select>
                </div>

                {(formData.type === 'customer' || formData.type === 'investor') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                        <input
                            type="text"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                    </div>
                )}

                {formData.type === 'investor' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Customer %</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.investorPercentage.customer}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        investorPercentage: {
                                            customer: parseInt(e.target.value) || 0,
                                            company: 100 - (parseInt(e.target.value) || 0),
                                        },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company %</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                                value={formData.investorPercentage.company}
                            />
                        </div>
                    </div>
                )}

                <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Agreement Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Amount *</label>
                            <input
                                type="number"
                                required
                                step="1"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.agreement.totalAmount}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        agreement: { ...formData.agreement, totalAmount: e.target.value },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({ ...formData, status: e.target.value as 'active' | 'completed' | 'on-hold' })
                                }
                            >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="on-hold">On Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                            <input
                                type="date"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.agreement.startDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        agreement: { ...formData.agreement, startDate: e.target.value },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Date *</label>
                            <input
                                type="date"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.agreement.endDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        agreement: { ...formData.agreement, endDate: e.target.value },
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            rows={3}
                            value={formData.agreement.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    agreement: { ...formData.agreement, description: e.target.value },
                                })
                            }
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Supervisor</label>
                    <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.supervisor}
                        onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Contractors</label>
                    <select
                        multiple
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.contractors}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                contractors: Array.from(e.target.selectedOptions, (option) => option.value),
                            })
                        }
                        size={Math.min(Math.max(contractorSelectOptions.length, 4), 8)}
                        disabled={optionsLoading || contractorSelectOptions.length === 0}
                    >
                        {contractorSelectOptions.map((contractorName) => (
                            <option key={contractorName} value={contractorName}>
                                {contractorName}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple contractors.</p>
                    {contractorSelectOptions.length === 0 && !optionsLoading && (
                        <p className="mt-1 text-xs text-amber-600">No contractors found. Add contractor first.</p>
                    )}
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/owner/contractors')}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                    >
                        + Add Contractor
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Vendors</label>
                    <select
                        multiple
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.vendors}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                vendors: Array.from(e.target.selectedOptions, (option) => option.value),
                            })
                        }
                        size={Math.min(Math.max(vendorSelectOptions.length, 4), 8)}
                        disabled={optionsLoading || vendorSelectOptions.length === 0}
                    >
                        {vendorSelectOptions.map((vendorName) => (
                            <option key={vendorName} value={vendorName}>
                                {vendorName}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple vendors.</p>
                    {vendorSelectOptions.length === 0 && !optionsLoading && (
                        <p className="mt-1 text-xs text-amber-600">No vendors found. Add vendor first.</p>
                    )}
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/owner/vendors')}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                    >
                        + Add Vendor
                    </button>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
