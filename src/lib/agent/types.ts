import { TravelPackage, DestinationFlexibility, AlternativePackage } from '@/lib/packages';

export type ExtractionCertainty = 'explicit' | 'strong_inference' | 'weak_inference' | 'unknown';
export type PreferenceStrength = 'hard' | 'strong' | 'soft' | 'neutral' | 'excluded';
export type SemanticRelation =
  | 'LIKES'
  | 'SIMILAR_TO'
  | 'SELECTS'
  | 'EXCLUDES'
  | 'COMPARES_TO'
  | 'REFERENCES'
  | 'INFO_QUERY';
export type RequirementMode = 'ACTUAL_REQUIREMENT' | 'HYPOTHETICAL' | 'EXPLORATORY' | 'CONFIRMED';
export type FieldStatus = 'unset' | 'unknown' | 'open' | 'set' | 'declined';

export type AgentGoal =
  | 'GREET'
  | 'CLARIFY_AMBIGUITY'
  | 'EXPLAIN_CONFLICT'
  | 'ANSWER_INFO_QUERY'
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
  | 'UNSUPPORTED'
  | 'CLARIFY'
  | 'INFO_QUERY';

export interface EntityValue<T = string> {
  value: T;
  rawText: string;
  certainty: ExtractionCertainty;
}

export interface DestinationEntity {
  country?: EntityValue;
  region?: EntityValue;
  destination?: EntityValue;
  attraction?: EntityValue;
  relation: SemanticRelation;
  locked?: boolean;
}

export interface BudgetEntity {
  amount: number | null;
  rawAmount?: number | null;
  type: 'per_person' | 'total' | 'unknown';
  calculatedPerPerson: number | null;
  currency: string;
  min?: number | null;
  max: boolean;
  scope?: 'all_inclusive' | 'land_package_only' | 'hotels_only' | 'unspecified';
  flexibility?: 'strict' | 'flexible' | 'stretch';
  strength: PreferenceStrength;
  mode: RequirementMode;
}

export interface TravelersEntity {
  total?: number | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  groupType?: 'solo' | 'couple' | 'couples' | 'family' | 'friends' | 'group' | null;
  certainty: ExtractionCertainty;
  mode: RequirementMode;
}

export interface DurationEntity {
  days?: number | null;
  nights?: number | null;
  isFlexible?: boolean;
  isShortTrip?: boolean;
  seasonPreference?: string | null;
}

export interface AmbiguityRecord {
  field: string;
  reason: string;
  candidates?: string[];
  clarificationQuestion: string;
}

export interface ConstraintConflict {
  detected: boolean;
  type: 'logical' | 'financial' | 'catalog' | 'availability' | 'unknown';
  reason: string;
  explanation: string;
}

export interface CoreferenceRecord {
  text: string;
  resolvesTo?: string | null;
  type: 'destination' | 'package' | 'option' | 'interest';
  ambiguous?: boolean;
  candidates?: string[];
}

export interface StateMutation {
  field: 'destination' | 'budget' | 'travelers' | 'duration' | 'interests' | 'dates' | 'tripStyle';
  action: 'set' | 'replace' | 'remove' | 'correct' | 'append';
  value: unknown;
  reason?: string;
}

export interface EvidenceTraceItem {
  field: string;
  value: unknown;
  evidence: string;
  source: 'explicit_entity' | 'interest_phrase' | 'coreference' | 'contextual_inference';
  certainty: ExtractionCertainty;
}

export interface CustomerPreferences {
  destination: string | null;
  destinationEntity?: DestinationEntity | null;
  destinationFlexibility: DestinationFlexibility;
  budgetPerPerson: number | null;
  budgetEntity?: BudgetEntity | null;
  travelers: number | null;
  travelersEntity?: TravelersEntity | null;
  durationDays: number | null;
  durationEntity?: DurationEntity | null;
  tripStyle: string | null;
  interests: string[];
  excludedInterests: string[];
  excludedDestinations: string[];
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
  lastSurfacedPackages?: TravelPackage[];
  lastSurfacedOptions?: string[];
  lastAssistantQuestion?: string | null;
  lastAmbiguity?: AmbiguityRecord | null;
  lastConflict?: ConstraintConflict | null;
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
  evidenceTrace?: EvidenceTraceItem[];
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
  intent: AgentIntent;
  isGreeting: boolean;
  detectedStyle: string | null;
  destination?: DestinationEntity;
  destinationPreference?: string | null;
  referenceDestination?: string | null;
  interests: string[];
  excludedInterests: string[];
  excludedDestinations: string[];
  budget?: BudgetEntity;
  travelers?: TravelersEntity;
  duration?: DurationEntity;
  destinationFlexibility: DestinationFlexibility;
  isDomesticOnly: boolean;
  excludePackageId: string | null;
  requestedUncatalogedDestination: string | null;
  ambiguity?: AmbiguityRecord[];
  constraintConflict?: ConstraintConflict | null;
  coreference?: CoreferenceRecord | null;
  mutations?: StateMutation[];
  evidenceTrace?: EvidenceTraceItem[];
  isPriceObjection: boolean;
  isCustomTokenAttempt: boolean;
  isUnverifiedPaymentClaim: boolean;
  isBookingIntent: boolean;
  selectedOptionNumber: number | null;
  customerPhone: string | null;
  customerEmail: string | null;
  latestUserText: string;
  rawText: string;
  normalizedText: string;
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
    excludedInterests?: string[];
    excludedDestinations?: string[];
    destination: string | null;
    destinationFlexibility?: DestinationFlexibility;
    budgetPerPerson: number | null;
    travelers: number | null;
    durationDays: number | null;
    isDomesticOnly: boolean;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    ambiguity?: AmbiguityRecord[] | null;
    constraintConflict?: ConstraintConflict | null;
    requirementMode?: RequirementMode;
  };
  memory: AgentMemory;
  executedTool?: {
    toolName: string;
    input: unknown;
    output: unknown;
  };
  quickReplies?: QuickReply[];
}

export type QuickReplyType =
  | 'interest'
  | 'destination'
  | 'budget'
  | 'traveler_group'
  | 'duration'
  | 'action'
  | 'free_text';

export interface QuickReply {
  type: QuickReplyType;
  label: string;
  value: string | number;
  category?: string;
}

