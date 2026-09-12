import {
  TravelPackage,
  TRAVEL_PACKAGES,
  queryCatalog
} from '@/lib/packages';
import { AgentTool, CustomerPreferences } from './types';

// Tool 1: search_packages
export interface SearchPackagesInput {
  destination?: string | null;
  maxBudget?: number | null;
  tripType?: string | null;
  durationDays?: number | null;
  isDomesticOnly?: boolean;
  excludePackageId?: string | null;
  text?: string;
}

export const searchPackagesTool: AgentTool<SearchPackagesInput, TravelPackage[]> = {
  name: 'search_packages',
  description: 'Deterministic catalog search against verified packages by budget, destination, trip style, and duration.',
  execute: async (input) => {
    return queryCatalog({
      text: input.text,
      destination: input.destination || undefined,
      maxBudget: input.maxBudget || undefined,
      tripType: input.tripType || undefined,
      durationDays: input.durationDays || undefined,
      isDomesticOnly: input.isDomesticOnly || false,
      excludePackageId: input.excludePackageId || undefined
    });
  }
};

// Tool 2: get_package_details
export const getPackageDetailsTool: AgentTool<{ packageId: string }, TravelPackage | null> = {
  name: 'get_package_details',
  description: 'Retrieve complete itinerary, inclusions, exclusions, and pricing for a specific travel package ID.',
  execute: async ({ packageId }) => {
    return TRAVEL_PACKAGES.find((p) => p.id === packageId) || null;
  }
};

// Tool 3: qualify_lead
export interface QualifyLeadResult {
  isQualified: boolean;
  missingFields: ('destination' | 'budget' | 'travelers' | 'duration')[];
  promptQuestions: string[];
}

export const qualifyLeadTool: AgentTool<CustomerPreferences, QualifyLeadResult> = {
  name: 'qualify_lead',
  description: 'Enforce minimum qualification gates before recommendations are generated.',
  execute: async (pref, memory) => {
    const missing: ('destination' | 'budget' | 'travelers' | 'duration')[] = [];
    if (!pref.destination) missing.push('destination');
    if (!pref.budgetPerPerson) missing.push('budget');
    if (!pref.travelers) missing.push('travelers');
    if (!pref.durationDays) missing.push('duration');

    // Minimum qualification gate:
    // Recommendation generation is permitted ONLY when the minimum required qualification state is satisfied.
    // E.g. "I want a honeymoon trip." has tripStyle='honeymoon', but destination=null and budget=null -> isQualified=false.
    const hasSufficientQualification = Boolean(
      (pref.destination && pref.budgetPerPerson) ||
      (pref.destination && (pref.travelers || pref.durationDays || pref.tripStyle)) ||
      (pref.budgetPerPerson && (pref.destination || pref.tripStyle || pref.travelers || pref.durationDays))
    );

    const questions: string[] = [];
    if (!pref.destination) {
      questions.push('Do you have a preferred destination in mind, or are you open to domestic and international options?');
    }
    if (!pref.budgetPerPerson) {
      questions.push('What is your approximate budget per person for this trip?');
    }
    if (!pref.travelers) {
      questions.push('How many travelers will be journeying with you?');
    }

    memory.conversation.missingFields = missing;

    return {
      isQualified: hasSufficientQualification,
      missingFields: missing,
      promptQuestions: questions
    };
  }
};

// Tool 4: handle_price_objection
export interface PriceObjectionResult {
  acknowledged: boolean;
  budgetCleared: boolean;
  promptQuestion: string;
}

export const handlePriceObjectionTool: AgentTool<void, PriceObjectionResult> = {
  name: 'handle_price_objection',
  description: 'Acknowledge price/cost objections, clear prior budget, and prompt for target comfortable budget.',
  execute: async (_, memory) => {
    memory.customer.preferences.budgetPerPerson = null;
    memory.conversation.isPriceObjectionActive = true;
    memory.conversation.lastObjection = 'PRICE_TOO_HIGH';

    return {
      acknowledged: true,
      budgetCleared: true,
      promptQuestion: 'What budget per person would you be comfortable with for this journey?'
    };
  }
};

// Tool 5: prepare_booking_token
export interface PrepareBookingTokenInput {
  packageId?: string | null;
  packageTitle?: string | null;
}

export interface PrepareBookingTokenResult {
  tokenAmount: number;
  currency: string;
  isRefundable: boolean;
  packageId?: string | null;
  policyEnforced: boolean;
}

export const prepareBookingTokenTool: AgentTool<PrepareBookingTokenInput, PrepareBookingTokenResult> = {
  name: 'prepare_booking_token',
  description: 'Deterministic enforcement of standard booking reservation token policy (₹2,000 refundable).',
  execute: async (input, memory) => {
    const amount = memory.business.tokenAmount || 2000;
    if (input.packageId) {
      memory.business.selectedPackageId = input.packageId;
    }
    if (input.packageTitle) {
      memory.business.selectedPackageTitle = input.packageTitle;
    }
    memory.business.leadStatus = 'TOKEN_PENDING';

    return {
      tokenAmount: amount,
      currency: 'INR',
      isRefundable: true,
      packageId: input.packageId,
      policyEnforced: true
    };
  }
};

// Tool 6: escalate_to_desk
export interface EscalateToDeskInput {
  reason: string;
  destination?: string | null;
  customerNotes?: string;
}

export interface EscalateToDeskResult {
  escalated: boolean;
  department: string;
  referenceNotes: string;
}

export const escalateToDeskTool: AgentTool<EscalateToDeskInput, EscalateToDeskResult> = {
  name: 'escalate_to_desk',
  description: 'Escalate uncataloged or custom bespoke inquiries to human concierge desk.',
  execute: async (input) => {
    return {
      escalated: true,
      department: 'Senior Travel Concierge & Bespoke Charters Desk',
      referenceNotes: `Escalation Reason: ${input.reason} | Destination: ${input.destination || 'Unspecified'}`
    };
  }
};

export const STANDARD_AGENT_TOOLS: AgentTool<never, unknown>[] = [
  searchPackagesTool,
  getPackageDetailsTool,
  qualifyLeadTool,
  handlePriceObjectionTool,
  prepareBookingTokenTool,
  escalateToDeskTool
] as unknown as AgentTool<never, unknown>[];
