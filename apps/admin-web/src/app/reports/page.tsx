'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi } from '@/lib/api';
import { Search, Eye, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Report {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  resolution?: string;
  actionTaken?: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  reported?: {
    id: string;
    name: string;
    email: string;
  };
  booking?: {
    id: string;
    status: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolution, setResolution] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showDismissForm, setShowDismissForm] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getReports(filter || undefined);
      setReports(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport || !resolution || !actionTaken) return;

    try {
      setActionLoading(true);
      await adminApi.resolveReport(selectedReport.id, resolution, actionTaken);
      loadReports();
      closeModal();
    } catch (error) {
      console.error('Failed to resolve report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport || !dismissReason) return;

    try {
      setActionLoading(true);
      await adminApi.dismissReport(selectedReport.id, dismissReason);
      loadReports();
      closeModal();
    } catch (error) {
      console.error('Failed to dismiss report:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setResolution('');
    setActionTaken('');
    setDismissReason('');
    setShowResolveForm(false);
    setShowDismissForm(false);
  };

  const filteredReports = reports.filter((r) =>
    r.reporter?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reported?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      INVESTIGATING: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-gray-100 text-gray-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      USER: 'bg-purple-100 text-purple-800',
      PROVIDER: 'bg-blue-100 text-blue-800',
      BOOKING: 'bg-orange-100 text-orange-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Handle user reports and complaints</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reports..."
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
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reporter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reported
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadge(report.type)}`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.reporter?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.reported?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {report.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No reports found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Detail Modal */}
        {showModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    Report Details
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-sm rounded-full ${getTypeBadge(selectedReport.type)}`}>
                    {selectedReport.type}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadge(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Reporter</h4>
                    <p className="mt-1 font-medium">{selectedReport.reporter?.name}</p>
                    <p className="text-sm text-gray-500">{selectedReport.reporter?.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Reported User</h4>
                    <p className="mt-1 font-medium">{selectedReport.reported?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{selectedReport.reported?.email || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reason</h4>
                  <p className="mt-1 font-medium">{selectedReport.reason}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1 text-gray-700">{selectedReport.description}</p>
                </div>

                {selectedReport.status === 'RESOLVED' && selectedReport.resolution && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800">Resolution</h4>
                    <p className="mt-1 text-green-700">{selectedReport.resolution}</p>
                    {selectedReport.actionTaken && (
                      <>
                        <h4 className="text-sm font-medium text-green-800 mt-3">Action Taken</h4>
                        <p className="mt-1 text-green-700">{selectedReport.actionTaken}</p>
                      </>
                    )}
                  </div>
                )}

                {selectedReport.status === 'PENDING' && !showResolveForm && !showDismissForm && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowResolveForm(true)}
                      className="btn btn-success flex-1 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Resolve
                    </button>
                    <button
                      onClick={() => setShowDismissForm(true)}
                      className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Dismiss
                    </button>
                  </div>
                )}

                {showResolveForm && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium">Resolve Report</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resolution Summary
                      </label>
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="input h-24"
                        placeholder="Describe how the issue was resolved..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action Taken
                      </label>
                      <textarea
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        className="input h-24"
                        placeholder="What action was taken against the reported user..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleResolve}
                        disabled={actionLoading || !resolution || !actionTaken}
                        className="btn btn-success flex-1"
                      >
                        {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
                      </button>
                      <button
                        onClick={() => {
                          setShowResolveForm(false);
                          setResolution('');
                          setActionTaken('');
                        }}
                        className="btn btn-outline flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showDismissForm && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium">Dismiss Report</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for Dismissal
                      </label>
                      <textarea
                        value={dismissReason}
                        onChange={(e) => setDismissReason(e.target.value)}
                        className="input h-24"
                        placeholder="Why is this report being dismissed..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDismiss}
                        disabled={actionLoading || !dismissReason}
                        className="btn btn-danger flex-1"
                      >
                        {actionLoading ? 'Dismissing...' : 'Dismiss Report'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDismissForm(false);
                          setDismissReason('');
                        }}
                        className="btn btn-outline flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {(selectedReport.status !== 'PENDING' || (!showResolveForm && !showDismissForm)) && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={closeModal}
                      className="btn btn-outline flex-1"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
