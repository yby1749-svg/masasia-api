'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi } from '@/lib/api';
import {
  Check,
  X,
  Eye,
  Search,
  Filter,
  UserX,
  UserCheck,
} from 'lucide-react';

interface Provider {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  displayName?: string;
  status: string;
  bio: string;
  yearsOfExperience?: number;
  rating: number;
  completedBookings?: number;
  createdAt: string;
  shop?: {
    name: string;
  };
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadProviders();
  }, [filter]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getProviders(filter || undefined);
      setProviders(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.approveProvider(id);
      loadProviders();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to approve provider:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.rejectProvider(id, rejectReason);
      loadProviders();
      setShowRejectModal(false);
      setShowModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject provider:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await adminApi.suspendProvider(id, reason);
      loadProviders();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to suspend provider:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.unsuspendProvider(id);
      loadProviders();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to unsuspend provider:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProviders = providers.filter((p) =>
    `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const classes = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      SUSPENDED: 'bg-gray-100 text-gray-800',
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
            <p className="text-gray-500 mt-1">Manage massage therapists</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                              {provider.user.firstName?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.displayName || `${provider.user.firstName} ${provider.user.lastName}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {provider.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {provider.shop?.name || (
                            <span className="text-gray-400">Independent</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                            provider.status
                          )}`}
                        >
                          {provider.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {provider.rating?.toFixed(1) || 'N/A'} ⭐
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {provider.completedBookings || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {provider.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(provider.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProvider(provider);
                                  setShowRejectModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {provider.status === 'APPROVED' && (
                            <button
                              onClick={() => handleSuspend(provider.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          )}
                          {provider.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleUnsuspend(provider.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProviders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No providers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Provider Detail Modal */}
        {showModal && selectedProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Provider Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-2xl text-primary-700 font-bold">
                      {selectedProvider.user.firstName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedProvider.displayName || `${selectedProvider.user.firstName} ${selectedProvider.user.lastName}`}</h3>
                    <p className="text-gray-500">{selectedProvider.user.email}</p>
                    <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedProvider.status)}`}>
                      {selectedProvider.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedProvider.user.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Shop</p>
                    <p className="font-medium">{selectedProvider.shop?.name || 'Independent'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-medium">{selectedProvider.yearsOfExperience || 0} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="font-medium">{selectedProvider.completedBookings || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rating</p>
                    <p className="font-medium">{selectedProvider.rating?.toFixed(1) || 'N/A'} ⭐</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registered</p>
                    <p className="font-medium">{new Date(selectedProvider.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedProvider.bio && (
                  <div>
                    <p className="text-sm text-gray-500">Bio</p>
                    <p className="mt-1">{selectedProvider.bio}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedProvider.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedProvider.id)}
                        disabled={actionLoading}
                        className="btn btn-success flex-1"
                      >
                        {actionLoading ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                        className="btn btn-danger flex-1"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedProvider.status === 'APPROVED' && (
                    <button
                      onClick={() => handleSuspend(selectedProvider.id)}
                      disabled={actionLoading}
                      className="btn btn-danger flex-1"
                    >
                      {actionLoading ? 'Processing...' : 'Suspend'}
                    </button>
                  )}
                  {selectedProvider.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleUnsuspend(selectedProvider.id)}
                      disabled={actionLoading}
                      className="btn btn-success flex-1"
                    >
                      {actionLoading ? 'Processing...' : 'Unsuspend'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn btn-outline flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Reject Provider</h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input h-32"
                  placeholder="Enter reason for rejection..."
                />
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleReject(selectedProvider.id)}
                    disabled={actionLoading || !rejectReason}
                    className="btn btn-danger flex-1"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Provider'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    className="btn btn-outline flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
