import { AgentGoal, AgentMemory, PerceptionResult, AgentAction } from './types';
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

  // Scenario 1: Unverified payment assertion
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

  // Scenario 2: Unauthorized custom token attempt
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

  // Scenario 3: Uncataloged destination requested
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

  // Scenario 4: Price / budget objection
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

  // Scenario 5: Qualification gate evaluation
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

  // Scenario 6: Booking intent
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

  // Scenario 7: Fully qualified -> Search & Recommend Packages
  const searchParams: SearchPackagesInput = {
    text: perception.latestUserText,
    destination: memory.customer.preferences.destination,
    destinationFlexibility: memory.customer.preferences.destinationFlexibility,
    maxBudget: memory.customer.preferences.budgetPerPerson,
    tripType: memory.customer.preferences.tripStyle,
    interests: memory.customer.preferences.interests,
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
