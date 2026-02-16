'use client';

import { useState, useEffect } from 'react';

interface EditRequest {
    _id: string;
    collectionName: 'Expense' | 'Income' | 'Loan' | 'Contractor' | 'Vendor';
    originalId: any;
    newData: any;
    status: 'pending' | 'approved' | 'rejected';
    requestedBy: { _id: string; name: string; email: string };
    projectId: { _id: string; name: string };
    createdAt: string;
}

type FlatChange = {
    key: string;
    label: string;
    originalValue: unknown;
    newValue: unknown;
};

const prettifyLabel = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .trim()
        .replace(/^./, (c) => c.toUpperCase());
};

const collectNestedChanges = (
    parentKey: string,
    newObj: Record<string, any> | null | undefined,
    originalObj: Record<string, any> | null | undefined
): FlatChange[] => {
    if (!newObj || typeof newObj !== 'object') return [];

    const changes: FlatChange[] = [];

    Object.entries(newObj).forEach(([childKey, childValue]) => {
        // Skip empty values
        if (childValue === undefined || childValue === null || childValue === '') return;

        const originalValue = originalObj ? originalObj[childKey] : undefined;

        // Only compare primitive-level values here
        if (typeof childValue === 'object') return;

        const hasChanged = String(originalValue ?? '') !== String(childValue ?? '');
        if (!hasChanged) return;

        const composedKey = `${parentKey}.${childKey}`;

        changes.push({
            key: composedKey,
            label: prettifyLabel(composedKey),
            originalValue,
            newValue: childValue,
        });
    });

    return changes;
};

export default function EditRequestsList() {
    const [requests, setRequests] = useState<EditRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await fetch('/api/requests');
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;

        try {
            const response = await fetch(`/api/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (response.ok) {
                // Remove processed request from list
                setRequests(requests.filter((req) => req._id !== requestId));
                alert(`Request ${action}ed successfully`);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to process request');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            alert('An error occurred');
        }
    };

    if (loading) return <div>Loading requests...</div>;

    if (requests.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Requests</h3>
                <p className="text-gray-500">No pending requests.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow mt-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Pending Edit Requests ({requests.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
                {requests.map((request) => (
                    <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-indigo-600">
                                    {request.collectionName} modification requested by {request.requestedBy.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Project: <span className="font-medium text-gray-900">{request.projectId?.name}</span> •{' '}
                                    {new Date(request.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleAction(request._id, 'approve')}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(request._id, 'reject')}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 bg-gray-50 p-4 rounded-md text-sm">
                            <h4 className="font-medium text-gray-700 mb-2">Requested Changes:</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    const flatChanges: FlatChange[] = [];

                                    Object.entries(request.newData || {}).forEach(([key, value]) => {
                                        if (key === '_id' || key === 'updatedAt' || key === 'createdAt' || key === 'projectId' || key === 'enteredBy') {
                                            return;
                                        }

                                        const originalValue = request.originalId ? (request.originalId as any)[key] : undefined;

                                        // Handle nested objects (bankDetails, laborDetails, materialDetails, pettyCashDetails, etc.)
                                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                                            flatChanges.push(
                                                ...collectNestedChanges(
                                                    key,
                                                    value as Record<string, any>,
                                                    (originalValue as Record<string, any>) || {}
                                                )
                                            );
                                            return;
                                        }

                                        const hasChanged = String(originalValue ?? '') !== String(value ?? '');

                                        flatChanges.push({
                                            key,
                                            label: prettifyLabel(key),
                                            originalValue,
                                            newValue: value,
                                        });
                                    });

                                    // If nothing changed (should be rare), still show raw data as a fallback
                                    if (flatChanges.length === 0) {
                                        return Object.entries(request.newData || {}).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-xs text-gray-500 capitalize">{prettifyLabel(key)}</span>
                                                <span className="font-medium text-gray-900">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ));
                                    }

                                    return flatChanges.map((change) => {
                                        const { key, label, originalValue, newValue } = change;
                                        const hasChanged = String(originalValue ?? '') !== String(newValue ?? '');

                                        return (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-xs text-gray-500">{label}</span>
                                                <span className="font-medium text-gray-900">
                                                    {hasChanged && originalValue !== undefined ? (
                                                        <span className="line-through text-gray-400 mr-2">
                                                            {typeof originalValue === 'object'
                                                                ? JSON.stringify(originalValue)
                                                                : String(originalValue)}
                                                        </span>
                                                    ) : null}
                                                    <span className={hasChanged ? 'text-indigo-600' : 'text-gray-900'}>
                                                        {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue ?? '')}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
