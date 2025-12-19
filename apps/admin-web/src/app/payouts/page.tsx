'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi } from '@/lib/api';
import { Check, X, Search, CreditCard, Store } from 'lucide-react';

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  accountDetails: any;
  referenceNumber?: string;
  provider?: {
    user: {
      name: string;
      email: string;
    };
  };
  shop?: {
    name: string;
    owner: {
      name: string;
      email: string;
    };
  };
  createdAt: string;
  processedAt?: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [shopPayouts, setShopPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [tab, setTab] = useState<'provider' | 'shop'>('provider');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [processModal, setProcessModal] = useState<{ payout: Payout; type: 'provider' | 'shop' } | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [rejectModal, setRejectModal] = useState<{ payout: Payout; type: 'provider' | 'shop' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPayouts();
  }, [filter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const [providerRes, shopRes] = await Promise.all([
        adminApi.getPayouts(filter || undefined),
        adminApi.getShopPayouts(filter || undefined),
      ]);
      setPayouts(providerRes.data.data || providerRes.data);
      setShopPayouts(shopRes.data.data || shopRes.data);
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!processModal || !referenceNumber) return;

    try {
      setActionLoading(true);
      if (processModal.type === 'provider') {
        await adminApi.processPayout(processModal.payout.id, referenceNumber);
      } else {
        await adminApi.processShopPayout(processModal.payout.id, referenceNumber);
      }
      loadPayouts();
      setProcessModal(null);
      setReferenceNumber('');
    } catch (error) {
      console.error('Failed to process payout:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason) return;

    try {
      setActionLoading(true);
      if (rejectModal.type === 'provider') {
        await adminApi.rejectPayout(rejectModal.payout.id, rejectReason);
      } else {
        await adminApi.rejectShopPayout(rejectModal.payout.id, rejectReason);
      }
      loadPayouts();
      setRejectModal(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject payout:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const currentPayouts = tab === 'provider' ? payouts : shopPayouts;
  const filteredPayouts = currentPayouts.filter((p) => {
    const name = tab === 'provider' ? p.provider?.user?.name : p.shop?.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
            <p className="text-gray-500 mt-1">Process payout requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setTab('provider')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                tab === 'provider'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Provider Payouts
              {payouts.filter((p) => p.status === 'PENDING').length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {payouts.filter((p) => p.status === 'PENDING').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('shop')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                tab === 'shop'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Store className="w-5 h-5" />
              Shop Payouts
              {shopPayouts.filter((p) => p.status === 'PENDING').length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {shopPayouts.filter((p) => p.status === 'PENDING').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${tab === 'provider' ? 'providers' : 'shops'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {tab === 'provider' ? 'Provider' : 'Shop'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tab === 'provider'
                            ? payout.provider?.user?.name
                            : payout.shop?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tab === 'provider'
                            ? payout.provider?.user?.email
                            : payout.shop?.owner?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-gray-900">
                          ₱{payout.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.method}
                        {payout.accountDetails && (
                          <div className="text-xs text-gray-500">
                            {payout.accountDetails.accountNumber || payout.accountDetails.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(payout.status)}`}>
                          {payout.status}
                        </span>
                        {payout.referenceNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            Ref: {payout.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {payout.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setProcessModal({ payout, type: tab })}
                              className="text-green-600 hover:text-green-900"
                              title="Process"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setRejectModal({ payout, type: tab })}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPayouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No payouts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Process Modal */}
        {processModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Process Payout</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-2xl font-bold">₱{processModal.payout.amount?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    To: {processModal.type === 'provider'
                      ? processModal.payout.provider?.user?.name
                      : processModal.payout.shop?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Method: {processModal.payout.method}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="input"
                    placeholder="Enter reference/transaction number"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleProcess}
                    disabled={actionLoading || !referenceNumber}
                    className="btn btn-success flex-1"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Payment'}
                  </button>
                  <button
                    onClick={() => {
                      setProcessModal(null);
                      setReferenceNumber('');
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

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Reject Payout</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-2xl font-bold">₱{rejectModal.payout.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input h-24"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectReason}
                    className="btn btn-danger flex-1"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Payout'}
                  </button>
                  <button
                    onClick={() => {
                      setRejectModal(null);
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
