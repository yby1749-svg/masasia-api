'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi } from '@/lib/api';
import {
  Check,
  X,
  Eye,
  Search,
  Store,
  MapPin,
  Users,
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  status: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    providers: number;
  };
  createdAt: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadShops();
  }, [filter]);

  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getShops(filter || undefined);
      setShops(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to load shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.approveShop(id);
      loadShops();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to approve shop:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.rejectShop(id, rejectReason);
      loadShops();
      setShowRejectModal(false);
      setShowModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject shop:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await adminApi.suspendShop(id, reason);
      loadShops();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to suspend shop:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner?.name?.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
            <p className="text-gray-500 mt-1">Manage massage shops</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search shops..."
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
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Providers
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
                  {filteredShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary-700" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {shop.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {shop.address?.substring(0, 30)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{shop.owner?.name}</div>
                        <div className="text-sm text-gray-500">{shop.owner?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                            shop.status
                          )}`}
                        >
                          {shop.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Users className="w-4 h-4 text-gray-400" />
                          {shop._count?.providers || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(shop.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedShop(shop);
                              setShowModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {shop.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(shop.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedShop(shop);
                                  setShowRejectModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredShops.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No shops found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Shop Detail Modal */}
        {showModal && selectedShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Shop Details</h2>
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
                  <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Store className="w-8 h-8 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedShop.name}</h3>
                    <p className="text-gray-500">Owner: {selectedShop.owner?.name}</p>
                    <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedShop.status)}`}>
                      {selectedShop.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedShop.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Providers</p>
                    <p className="font-medium">{selectedShop._count?.providers || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{selectedShop.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Owner Email</p>
                    <p className="font-medium">{selectedShop.owner?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registered</p>
                    <p className="font-medium">{new Date(selectedShop.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedShop.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1">{selectedShop.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedShop.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedShop.id)}
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
                  {selectedShop.status === 'APPROVED' && (
                    <button
                      onClick={() => handleSuspend(selectedShop.id)}
                      disabled={actionLoading}
                      className="btn btn-danger flex-1"
                    >
                      {actionLoading ? 'Processing...' : 'Suspend'}
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
        {showRejectModal && selectedShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Reject Shop</h2>
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
                    onClick={() => handleReject(selectedShop.id)}
                    disabled={actionLoading || !rejectReason}
                    className="btn btn-danger flex-1"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Shop'}
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
