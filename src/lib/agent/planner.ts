import { AgentGoal, AgentMemory, PerceptionResult, AgentAction, HandoffReason } from './types';
import { qualifyLeadTool, SearchPackagesInput } from './tools';

export interface PlanResult {
  goal: AgentGoal;
  action: AgentAction;
  notes: string;
}

export async function planNextAction(
  perception: PerceptionResult,
  memory: AgentMemory,
  totalMessagesCount: number
): Promise<PlanResult> {
  // Scenario 0: Initial greeting or pure greeting message
  if (totalMessagesCount === 0 || perception.isGreeting) {
    return {
      goal: 'GREET',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: 'Customer opened conversation with greeting; provide warm concierge welcome without assumptions.',
        goal: 'GREET'
      },
      notes: 'Greeting event.'
    };
  }

  // Scenario 1: Information Query (Cat AA: e.g. "Is Goa expensive?", "Does Kashmir have snow?")
  if (perception.intent === 'INFO_QUERY') {
    return {
      goal: 'ANSWER_INFO_QUERY',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: 'Customer asked an informational question about a place rather than booking.',
        goal: 'ANSWER_INFO_QUERY'
      },
      notes: 'Information discovery query.'
    };
  }

  // Scenario 2: Unverified payment assertion
  if (perception.isUnverifiedPaymentClaim) {
    return {
      goal: 'RESOLVE_PAYMENT_INQUIRY',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: 'Payment verification requires cryptographic backend confirmation.',
        goal: 'RESOLVE_PAYMENT_INQUIRY'
      },
      notes: 'Customer claims payment completed without verified webhook/callback.'
    };
  }

  // Scenario 3: Unauthorized custom token attempt
  if (perception.isCustomTokenAttempt) {
    return {
      goal: 'PREPARE_BOOKING_TOKEN',
      action: {
        toolName: 'prepare_booking_token',
        parameters: { packageId: memory.business.selectedPackageId },
        reasoning: 'Token is fixed at agency policy rate; custom amounts disallowed.',
        goal: 'PREPARE_BOOKING_TOKEN'
      },
      notes: 'Enforce standard booking token policy.'
    };
  }

  // Scenario 3b: Explicit human handoff request (highest priority override)
  if (perception.isHumanHandoffRequest) {
    return {
      goal: 'HUMAN_HANDOFF',
      action: {
        toolName: 'escalate_to_desk',
        parameters: { reason: 'Customer explicitly requested a human agent', handoffReason: 'customer_requested' as HandoffReason },
        reasoning: 'Customer explicitly requested to speak with a human. Immediate handoff — no qualification questions.',
        goal: 'HUMAN_HANDOFF'
      },
      notes: 'Explicit human handoff request.'
    };
  }

  // Scenario 3c: Repeated resolution failure (≥3 stuck turns)
  if (memory.conversation.resolutionFailureCount >= 3) {
    return {
      goal: 'HUMAN_HANDOFF',
      action: {
        toolName: 'escalate_to_desk',
        parameters: { reason: `Repeated resolution failure after ${memory.conversation.resolutionFailureCount} stuck turns`, handoffReason: 'repeated_failed_resolution' as HandoffReason },
        reasoning: 'Customer and agent have been stuck in the same resolution loop. Escalating to human.',
        goal: 'HUMAN_HANDOFF'
      },
      notes: `Resolution failure count: ${memory.conversation.resolutionFailureCount}`
    };
  }

  // Scenario 3d: Complex request requiring human specialist
  const complexKeywords = /\b(?:custom\s+itinerary|bespoke|corporate\s+group|group\s+of\s+(?:[2-9]\d|\d{3,})|refund|refunds|i\s+want\s+(?:my\s+)?(?:money\s+back|refund)|change\s+(?:my\s+)?(?:confirmed\s+)?booking|cancel\s+(?:my\s+)?booking|visa\s+(?:requirement|issue|problem)|i\s+paid\s+but|payment\s+(?:issue|problem|failed|not|stuck|pending)|booking\s+(?:says\s+pending|not\s+confirmed))\b/i;
  if (complexKeywords.test(perception.latestUserText)) {
    const isPaymentIssue = /\b(?:refund|money\s+back|i\s+paid\s+but|payment\s+(?:issue|problem|failed|stuck|pending)|booking\s+(?:says\s+pending|not\s+confirmed))\b/i.test(perception.latestUserText);
    const isBookingChange = /\b(?:change|cancel)\s+(?:my\s+)?(?:confirmed\s+)?booking\b/i.test(perception.latestUserText);
    const isRefund = /\b(?:refund|money\s+back)\b/i.test(perception.latestUserText);
    const handoffReason: HandoffReason = isRefund ? 'refund' : isPaymentIssue ? 'payment_issue' : isBookingChange ? 'booking_change' : 'custom_itinerary';
    return {
      goal: 'HUMAN_HANDOFF',
      action: {
        toolName: 'escalate_to_desk',
        parameters: { reason: `Complex request detected: ${perception.latestUserText.slice(0, 80)}`, handoffReason },
        reasoning: 'Complex request that requires human specialist (custom itinerary, group, payment, visa, booking change).',
        goal: 'HUMAN_HANDOFF'
      },
      notes: `Complex handoff reason: ${handoffReason}`
    };
  }

  // Scenario 4: Ambiguity Detected (Cat C, U: e.g. "casino like LA", competing referents "that one")
  if (perception.ambiguity && perception.ambiguity.length > 0) {
    return {
      goal: 'CLARIFY_AMBIGUITY',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: perception.ambiguity[0].reason,
        goal: 'CLARIFY_AMBIGUITY'
      },
      notes: `Ambiguity in field: ${perception.ambiguity[0].field}`
    };
  }

  // Scenario 5: Constraint Conflict Detected (Cat F: e.g. "Maldives under 10k")
  if (perception.constraintConflict && perception.constraintConflict.detected) {
    return {
      goal: 'EXPLAIN_CONFLICT',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: perception.constraintConflict.reason,
        goal: 'EXPLAIN_CONFLICT'
      },
      notes: `Conflict type: ${perception.constraintConflict.type}`
    };
  }

  // Scenario 6: Uncataloged destination requested
  if (perception.requestedUncatalogedDestination && !perception.destination) {
    return {
      goal: 'HANDLE_UNSUPPORTED_DESTINATION',
      action: {
        toolName: 'escalate_to_desk',
        parameters: {
          reason: `Customer requested uncataloged destination: ${perception.requestedUncatalogedDestination}`,
          destination: perception.requestedUncatalogedDestination
        },
        reasoning: 'Destination not in active catalog; route to concierge desk.',
        goal: 'HANDLE_UNSUPPORTED_DESTINATION'
      },
      notes: `Uncataloged destination: ${perception.requestedUncatalogedDestination}`
    };
  }

  // Scenario 7: Price / budget objection
  if (perception.isPriceObjection) {
    return {
      goal: 'HANDLE_PRICE_OBJECTION',
      action: {
        toolName: 'handle_price_objection',
        parameters: undefined,
        reasoning: 'Customer objected to pricing; clear budget and ask for target comfort level.',
        goal: 'HANDLE_PRICE_OBJECTION'
      },
      notes: 'Objection active: withhold packages and ask for target budget.'
    };
  }

  // Scenario 8: Booking intent (Takes precedence over qualification)
  if (perception.isBookingIntent) {
    return {
      goal: 'PREPARE_BOOKING_TOKEN',
      action: {
        toolName: 'prepare_booking_token',
        parameters: {
          packageId: memory.business.selectedPackageId,
          packageTitle: memory.business.selectedPackageTitle
        },
        reasoning: 'Customer chose package and is ready to secure reservation.',
        goal: 'PREPARE_BOOKING_TOKEN'
      },
      notes: 'Transitioning to checkout token.'
    };
  }

  // Scenario 9: Qualification gate evaluation
  const qualification = await qualifyLeadTool.execute(memory.customer.preferences, memory);
  if (!qualification.isQualified) {
    return {
      goal: 'QUALIFY_LEAD',
      action: {
        toolName: 'qualify_lead',
        parameters: memory.customer.preferences,
        reasoning: 'Missing core qualification parameters (e.g. destination and budget missing).',
        goal: 'QUALIFY_LEAD'
      },
      notes: 'Customer not yet qualified to receive package recommendations.'
    };
  }

  // Scenario 10: Fully qualified -> Search & Recommend Packages
  const searchParams: SearchPackagesInput = {
    text: perception.latestUserText,
    destination: memory.customer.preferences.destination,
    destinationFlexibility: memory.customer.preferences.destinationFlexibility,
    maxBudget: memory.customer.preferences.budgetPerPerson,
    tripType: memory.customer.preferences.tripStyle,
    interests: memory.customer.preferences.interests,
    excludedDestinations: memory.customer.preferences.excludedDestinations,
    excludedInterests: memory.customer.preferences.excludedInterests,
    durationDays: memory.customer.preferences.durationDays,
    isDomesticOnly: memory.customer.preferences.isDomesticOnly,
    excludePackageId: memory.customer.preferences.excludePackageId
  };

  return {
    goal: 'RECOMMEND_PACKAGES',
    action: {
      toolName: 'search_packages',
      parameters: searchParams,
      reasoning: 'Customer is qualified; query catalog deterministically with hard constraints.',
      goal: 'RECOMMEND_PACKAGES'
    },
    notes: 'Produce matching packages based on verified preferences.'
  };
}
