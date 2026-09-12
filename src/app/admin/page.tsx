import React from 'react';
import type { Metadata } from 'next';
import { getAllLeads } from '@/lib/crm';
import AdminCrmClient from './AdminCrmClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agency CRM & Booking Desk | Wanderlust Journeys',
  description: 'Real-time traveler lead pipeline, conversation transcripts, and verified Razorpay booking tokens.',
};

export default function AdminPage() {
  const leads = getAllLeads();
  return <AdminCrmClient initialLeads={leads} />;
}
