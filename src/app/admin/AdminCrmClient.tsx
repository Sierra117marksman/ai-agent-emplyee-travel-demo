'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeadRecord } from '@/lib/crm';
import {
  Compass,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
  MessageSquare,
  X,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Layers
} from 'lucide-react';

interface AdminCrmClientProps {
  initialLeads: LeadRecord[];
}

export default function AdminCrmClient({ initialLeads }: AdminCrmClientProps) {
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLeadForTranscript, setSelectedLeadForTranscript] = useState<LeadRecord | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  const totalTokensCollected = leads
    .filter((l) => l.status === 'BOOKING_CONFIRMED' || l.status === 'TOKEN_PAID')
    .reduce((acc, curr) => acc + (curr.tokenAmount || 0), 0);

  const confirmedBookingsCount = leads.filter(
    (l) => l.status === 'BOOKING_CONFIRMED' || l.status === 'TOKEN_PAID'
  ).length;

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.packageName && lead.packageName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONFIRMED' && (lead.status === 'BOOKING_CONFIRMED' || lead.status === 'TOKEN_PAID')) ||
      (statusFilter === 'PENDING' && lead.status === 'TOKEN_PENDING') ||
      (statusFilter === 'HANDOFF' && (lead.status === 'HUMAN_HANDOFF' || lead.status === 'HUMAN_RESOLVING')) ||
      (statusFilter === 'QUALIFIED' && lead.status === 'QUALIFIED');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Back to Site</span>
            <span className="xs:hidden sm:hidden">Back</span>
          </Link>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Agency CRM</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-normal">
                  Arjun AI
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">Autonomous Sales Leads & Token Ledger</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline sm:inline">Sync Realtime</span>
          <span className="xs:hidden sm:hidden">Sync</span>
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* KPI Metrics Cards (Adaptive 2x2 grid on mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 sm:mb-3">
              <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Tokens Collected</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
                <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white">
              ₹{totalTokensCollected.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-400 mt-1.5 sm:mt-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">Razorpay Verified</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 sm:mb-3">
              <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Confirmed Bookings</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-950/80 border border-teal-800/80 flex items-center justify-center text-teal-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white">{confirmedBookingsCount}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 truncate">₹2,000 Token Paid</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 sm:mb-3">
              <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Qualified Leads</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white">{leads.length}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 truncate">Engaged by Arjun</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 sm:mb-3">
              <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Conversion Rate</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-white">
              {leads.length > 0 ? Math.round((confirmedBookingsCount / leads.length) * 100) : 0}%
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-400 mt-1.5 sm:mt-2 truncate">Lead-to-Token Rate</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search traveler name, phone, destination..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Status:</span>
            {[
              { id: 'ALL', label: 'All Leads' },
              { id: 'CONFIRMED', label: 'Token Paid ✓' },
              { id: 'PENDING', label: 'Token Pending' },
              { id: 'HANDOFF', label: 'Human Handoff 👤' },
              { id: 'QUALIFIED', label: 'Qualified Only' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === f.id
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Card List View (Phones & small screens < 768px) */}
        <div className="block md:hidden space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No leads matching the current filter. Open the travel site and chat with Arjun to create live leads!
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm">{lead.customerName}</div>
                    <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-teal-400 shrink-0" />
                      <a href={`tel:${lead.customerPhone}`} className="hover:text-teal-300">
                        {lead.customerPhone || 'Phone pending'}
                      </a>
                    </div>
                  </div>

                  <div>
                    {lead.status === 'BOOKING_CONFIRMED' || lead.status === 'TOKEN_PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>CONFIRMED</span>
                      </span>
                    ) : lead.status === 'TOKEN_PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>PENDING</span>
                      </span>
                    ) : lead.status === 'HUMAN_HANDOFF' || lead.status === 'HUMAN_RESOLVING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800 whitespace-nowrap">
                        <span>👤</span>
                        <span>{lead.status === 'HUMAN_RESOLVING' ? 'RESOLVING' : 'HANDOFF'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 whitespace-nowrap">
                        <Layers className="w-3 h-3 text-blue-400" />
                        <span>QUALIFIED</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="text-white font-medium">{lead.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trip Scope:</span>
                    <span className="text-slate-200">{lead.travelers} Pax • {lead.tripStyle}</span>
                  </div>
                  {lead.packageName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Package:</span>
                      <span className="text-teal-300 font-medium truncate max-w-[200px] text-right">{lead.packageName}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-850">
                    <span className="text-slate-400">Token Amount:</span>
                    <span className="font-bold text-white">
                      {lead.tokenAmount ? `₹${lead.tokenAmount.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  {lead.razorpayPaymentId && (
                    <div className="flex justify-between text-[11px] font-mono text-emerald-400 pt-0.5">
                      <span className="text-slate-500 font-sans">Payment ID:</span>
                      <span>{lead.razorpayPaymentId}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadForTranscript(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                    <span>View Transcript</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Leads Table (Tablets & Desktops >= 768px) */}
        <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-850/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <th className="py-3.5 px-4">Traveler & Contact</th>
                  <th className="py-3.5 px-4">Trip Requirements</th>
                  <th className="py-3.5 px-4">Selected Package</th>
                  <th className="py-3.5 px-4">Token Ledger</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No leads matching the current filter. Open the travel website and chat with Arjun to create
                      live leads!
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-850/40 transition-colors">
                      {/* Traveler Contact */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{lead.customerName}</div>
                        <div className="text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-teal-400" />
                          <span>{lead.customerPhone || 'Phone pending'}</span>
                        </div>
                        {lead.customerEmail && (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{lead.customerEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* Requirements */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="font-medium text-white">{lead.destination}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{lead.travelers} Pax</span>
                          <span>•</span>
                          <span className="capitalize">{lead.tripStyle}</span>
                          <span>•</span>
                          <span>₹{(lead.budgetPerPerson || 0).toLocaleString('en-IN')}/pax</span>
                        </div>
                      </td>

                      {/* Package */}
                      <td className="py-4 px-4">
                        {lead.packageName ? (
                          <div>
                            <div className="font-semibold text-white">{lead.packageName}</div>
                            {lead.packagePrice && (
                              <div className="text-teal-300 text-[11px] font-medium mt-0.5">
                                ₹{lead.packagePrice.toLocaleString('en-IN')}/person
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Customizing with Arjun</span>
                        )}
                      </td>

                      {/* Token Ledger */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">
                          {lead.tokenAmount ? `₹${lead.tokenAmount.toLocaleString('en-IN')}` : '—'}
                        </div>
                        {lead.razorpayPaymentId ? (
                          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lead.razorpayPaymentId}</span>
                          </div>
                        ) : lead.razorpayOrderId ? (
                          <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                            Order: {lead.razorpayOrderId.substring(0, 14)}...
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting Checkout</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {lead.status === 'BOOKING_CONFIRMED' || lead.status === 'TOKEN_PAID' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>BOOKING CONFIRMED</span>
                          </span>
                        ) : lead.status === 'TOKEN_PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>TOKEN PENDING</span>
                          </span>
                        ) : lead.status === 'HUMAN_HANDOFF' || lead.status === 'HUMAN_RESOLVING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-950 text-orange-300 border border-orange-800">
                            <span>👤</span>
                            <span>{lead.status === 'HUMAN_RESOLVING' ? 'HUMAN RESOLVING' : 'HUMAN HANDOFF'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                            <Layers className="w-3 h-3 text-blue-400" />
                            <span>QUALIFIED LEAD</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForTranscript(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                          <span>Transcript</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Transcript Modal */}
      {selectedLeadForTranscript && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] sm:text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Arjun Patel AI Conversation
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {selectedLeadForTranscript.customerName} • {selectedLeadForTranscript.destination}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadForTranscript(null)}
                aria-label="Close transcript"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1 bg-slate-950/80">
              {selectedLeadForTranscript.chatTranscript && selectedLeadForTranscript.chatTranscript.length > 0 ? (
                selectedLeadForTranscript.chatTranscript.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="font-semibold text-[10px] uppercase mb-1 opacity-70">
                        {msg.role === 'user' ? selectedLeadForTranscript.customerName : 'Arjun Patel (AI)'}
                      </div>
                      <div className="whitespace-pre-line">{msg.content}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Direct lead creation record. No live chat transcript attached.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Captured: {new Date(selectedLeadForTranscript.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadForTranscript(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
