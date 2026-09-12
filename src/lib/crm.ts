import fs from 'fs';
import path from 'path';

export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'TOKEN_PENDING'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'TOKEN_PAID'
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'HOLD'
  | 'HUMAN_HANDOFF'
  | 'HUMAN_RESOLVING';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LeadRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  destination: string;
  travelDates: string;
  travelers: number;
  budgetPerPerson: number;
  tripStyle: string;
  packageId?: string;
  packageName?: string;
  packagePrice?: number;
  tokenAmount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: LeadStatus;
  agentName: string;
  chatTranscript: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllLeads(): LeadRecord[] {
  try {
    ensureDataDir();
    const content = fs.readFileSync(LEADS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLeadById(id: string): LeadRecord | undefined {
  const leads = getAllLeads();
  return leads.find((l) => l.id === id);
}

export function saveLead(lead: LeadRecord): LeadRecord {
  ensureDataDir();
  const leads = getAllLeads();
  const existingIndex = leads.findIndex((l) => l.id === lead.id);

  const updatedLead: LeadRecord = {
    ...lead,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    leads[existingIndex] = updatedLead;
  } else {
    leads.unshift(updatedLead);
  }

  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  return updatedLead;
}

export function updateLeadStatus(
  id: string,
  status: LeadStatus,
  metadata?: Partial<LeadRecord>
): LeadRecord | null {
  const lead = getLeadById(id);
  if (!lead) {
    return null;
  }

  const updated: LeadRecord = {
    ...lead,
    ...metadata,
    status,
    updatedAt: new Date().toISOString()
  };

  return saveLead(updated);
}
