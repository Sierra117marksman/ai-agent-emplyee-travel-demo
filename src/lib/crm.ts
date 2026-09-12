import fs from 'fs';
import path from 'path';
import os from 'os';

export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'TOKEN_PENDING'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'TOKEN_PAID'
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_VERIFIED_BUT_LEAD_MISSING'
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

export interface PaymentAuditRecord {
  orderId: string;
  paymentId: string;
  leadId: string;
  signature: string;
  status: 'PAYMENT_VERIFIED_BUT_LEAD_MISSING';
  recordedAt: string;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'travel-crm')
  : path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const AUDIT_FILE = path.join(DATA_DIR, 'payment_audits.json');
const SEED_FILE = path.join(process.cwd(), 'data', 'leads.json');

const inMemoryLeads = new Map<string, LeadRecord>();
const inMemoryAudits: PaymentAuditRecord[] = [];
let hasSeededInMemory = false;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LEADS_FILE)) {
      let initialContent = '[]';
      if (fs.existsSync(SEED_FILE)) {
        try {
          initialContent = fs.readFileSync(SEED_FILE, 'utf-8');
        } catch {
          initialContent = '[]';
        }
      }
      fs.writeFileSync(LEADS_FILE, initialContent, 'utf-8');
    }
  } catch (err) {
    // Graceful degradation: in read-only serverless filesystems, writes may log warning
    console.warn('[CRM] Notice: Filesystem write in current environment:', err instanceof Error ? err.message : String(err));
  }
}

export function getAllLeads(): LeadRecord[] {
  // If in-memory store already populated, return it directly
  if (inMemoryLeads.size > 0 || hasSeededInMemory) {
    return Array.from(inMemoryLeads.values());
  }

  let leads: LeadRecord[] = [];
  try {
    ensureDataDir();
    if (fs.existsSync(LEADS_FILE)) {
      const content = fs.readFileSync(LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) leads = parsed;
    }
  } catch (err) {
    console.warn('[CRM] Notice: Could not read from LEADS_FILE:', err instanceof Error ? err.message : String(err));
  }

  // If still empty in serverless, try reading bundled read-only seed file
  if (leads.length === 0 && isServerless) {
    try {
      if (fs.existsSync(SEED_FILE)) {
        const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
        const parsed = JSON.parse(seedContent);
        if (Array.isArray(parsed)) leads = parsed;
      }
    } catch {
      // ignore
    }
  }

  for (const lead of leads) {
    inMemoryLeads.set(lead.id, lead);
  }
  hasSeededInMemory = true;

  return Array.from(inMemoryLeads.values());
}

export function getLeadById(id: string): LeadRecord | undefined {
  if (inMemoryLeads.has(id)) {
    return inMemoryLeads.get(id);
  }
  const leads = getAllLeads();
  return leads.find((l) => l.id === id) || inMemoryLeads.get(id);
}

export function saveLead(lead: LeadRecord): LeadRecord {
  const updatedLead: LeadRecord = {
    ...lead,
    updatedAt: new Date().toISOString()
  };

  // Always update in-memory cache
  inMemoryLeads.set(updatedLead.id, updatedLead);
  hasSeededInMemory = true;

  // Persist to disk with error catching so EROFS on serverless never throws
  try {
    ensureDataDir();
    const allLeads = Array.from(inMemoryLeads.values());
    fs.writeFileSync(LEADS_FILE, JSON.stringify(allLeads, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[CRM] Failed to persist leads to disk (in-memory remains valid):', err instanceof Error ? err.message : String(err));
  }

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

export function recordPaymentAudit(audit: PaymentAuditRecord): void {
  inMemoryAudits.push(audit);
  try {
    ensureDataDir();
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(inMemoryAudits, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[CRM] Failed to persist payment audit:', err instanceof Error ? err.message : String(err));
  }
}

