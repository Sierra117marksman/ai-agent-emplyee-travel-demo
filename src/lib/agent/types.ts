import { TravelPackage, DestinationFlexibility, AlternativePackage } from '@/lib/packages';

export type AgentGoal =
  | 'GREET'
  | 'QUALIFY_LEAD'
  | 'HANDLE_PRICE_OBJECTION'
  | 'RECOMMEND_PACKAGES'
  | 'PREPARE_BOOKING_TOKEN'
  | 'HANDLE_UNSUPPORTED_DESTINATION'
  | 'RESOLVE_PAYMENT_INQUIRY'
  | 'ESCALATE_TO_DESK';

export type AgentIntent =
  | 'GREETING'
  | 'INQUIRY'
  | 'QUALIFYING'
  | 'PRICE_OBJECTION'
  | 'PACKAGE_SELECTION'
  | 'CHECKOUT'
  | 'UNSUPPORTED';

export interface CustomerPreferences {
  destination: string | null;
  destinationFlexibility: DestinationFlexibility;
  budgetPerPerson: number | null;
  travelers: number | null;
  durationDays: number | null;
  tripStyle: string | null;
  interests: string[];
  isDomesticOnly: boolean;
  excludePackageId?: string | null;
  requestedUncatalogedDestination?: string | null;
}

export interface CustomerMemory {
  name: string | null;
  phone: string | null;
  email: string | null;
  preferences: CustomerPreferences;
}

export interface ConversationMemory {
  currentIntent: AgentIntent;
  lastObjection: string | null;
  isPriceObjectionActive: boolean;
  missingFields: ('destination' | 'budget' | 'travelers' | 'duration')[];
  unsupportedDestination: string | null;
  turnCount: number;
}

export interface BusinessMemory {
  selectedPackageId: string | null;
  selectedPackageTitle: string | null;
  leadStatus: 'NEW' | 'QUALIFIED' | 'TOKEN_PENDING' | 'BOOKING_CONFIRMED';
  tokenOrderId: string | null;
  tokenPaymentId: string | null;
  tokenAmount: number;
}

export interface AgentMemory {
  customer: CustomerMemory;
  conversation: ConversationMemory;
  business: BusinessMemory;
}

export interface AgentAction<T = unknown> {
  toolName: string;
  parameters: T;
  reasoning: string;
  goal: AgentGoal;
}

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  parametersSchema?: Record<string, unknown>;
  execute: (input: TInput, memory: AgentMemory) => Promise<TOutput>;
}

export interface AgentConfig {
  agentId: string;
  name: string;
  role: string;
  companyName: string;
  personality: string;
  primaryGoal: string;
  secondaryGoals: string[];
  rules: string[];
  tokenPolicyAmount: number;
  availableDestinations: string[];
  tools: AgentTool<never, unknown>[];
}

export interface PerceptionResult {
  isGreeting: boolean;
  detectedStyle: string | null;
  interests: string[];
  isNewInquiry: boolean;
  destination: string | null;
  destinationFlexibility: DestinationFlexibility;
  budgetPerPerson: number | null;
  travelers: number | null;
  durationDays: number | null;
  isDomesticOnly: boolean;
  excludePackageId: string | null;
  requestedUncatalogedDestination: string | null;
  isPriceObjection: boolean;
  isCustomTokenAttempt: boolean;
  isUnverifiedPaymentClaim: boolean;
  isBookingIntent: boolean;
  selectedOptionNumber: number | null;
  customerPhone: string | null;
  customerEmail: string | null;
  latestUserText: string;
}

export interface AgentTurnResult {
  success: boolean;
  message: string;
  qualifyingPackages: TravelPackage[];
  alternativePackages: AlternativePackage[];
  suggestedPackages: TravelPackage[]; // Strictly qualifyingPackages (invariant)
  extractedLead: {
    tripStyle: string | null;
    interests: string[];
    destination: string | null;
    destinationFlexibility?: DestinationFlexibility;
    budgetPerPerson: number | null;
    travelers: number | null;
    durationDays: number | null;
    isDomesticOnly: boolean;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
  };
  memory: AgentMemory;
  executedTool?: {
    toolName: string;
    input: unknown;
    output: unknown;
  };
}
