import {
  TRAVEL_PACKAGES
} from '@/lib/packages';
import {
  AgentConfig,
  AgentTurnResult,
  AgentMemory
} from './types';
import { generateQuickReplies } from './quickReplies';
import { perceiveTurn } from './perception';
import { planNextAction } from './planner';
import {
  searchPackagesTool,
  SearchPackagesInput,
  qualifyLeadTool,
  handlePriceObjectionTool,
  prepareBookingTokenTool,
  escalateToDeskTool
} from './tools';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function queryGroq(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch {
    // Falls back gracefully to deterministic templates
  }
  return null;
}

export async function runAgentTurn(
  messages: ChatMessage[],
  config: AgentConfig
): Promise<AgentTurnResult> {
  const availableDestinations = config.availableDestinations;

  // 1. Greet if no messages
  if (messages.length === 0) {
    const initialMemory: AgentMemory = {
      customer: {
        name: null,
        phone: null,
        email: null,
        preferences: {
          destination: null,
          destinationFlexibility: 'unknown',
          budgetPerPerson: null,
          travelers: null,
          durationDays: null,
          tripStyle: null,
          interests: [],
          excludedInterests: [],
          excludedDestinations: [],
          isDomesticOnly: false
        }
      },
      conversation: {
        currentIntent: 'GREETING',
        lastObjection: null,
        isPriceObjectionActive: false,
        missingFields: ['destination', 'budget', 'travelers', 'duration'],
        unsupportedDestination: null,
        turnCount: 0
      },
      business: {
        selectedPackageId: null,
        selectedPackageTitle: null,
        leadStatus: 'NEW',
        tokenOrderId: null,
        tokenPaymentId: null,
        tokenAmount: config.tokenPolicyAmount
      }
    };

    const initialQuickReplies = generateQuickReplies({
      packages: TRAVEL_PACKAGES,
      availableDestinations,
      memory: initialMemory,
      goal: 'GREET'
    });

    return {
      success: true,
      message: `Namaste! 🙏 Welcome to ${config.companyName}. I am ${config.name}, your ${config.role}. Where are you thinking of traveling, and what kind of trip are you dreaming of? We currently offer curated journeys across ${availableDestinations.join(', ')}.`,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: initialQuickReplies,
      extractedLead: {
        tripStyle: null,
        interests: [],
        excludedInterests: [],
        excludedDestinations: [],
        destination: null,
        destinationFlexibility: 'unknown',
        budgetPerPerson: null,
        travelers: null,
        durationDays: null,
        isDomesticOnly: false,
        ambiguity: null,
        constraintConflict: null,
        requirementMode: undefined
      },
      memory: initialMemory
    };
  }

  // 2. Perception Phase
  const { perception, memory } = perceiveTurn(
    messages,
    availableDestinations,
    TRAVEL_PACKAGES,
    config.tokenPolicyAmount
  );

  // 3. Reasoning / Planning Phase
  const plan = await planNextAction(perception, memory, messages.length);
  const latestLower = perception.latestUserText.toLowerCase();

  // Helper for consistent lead return
  const getExtractedLead = (mem: AgentMemory) => ({
    tripStyle: mem.customer.preferences.tripStyle,
    interests: mem.customer.preferences.interests,
    excludedInterests: mem.customer.preferences.excludedInterests,
    excludedDestinations: mem.customer.preferences.excludedDestinations,
    destination: mem.customer.preferences.destination,
    destinationFlexibility: mem.customer.preferences.destinationFlexibility,
    budgetPerPerson: mem.customer.preferences.budgetPerPerson,
    travelers: mem.customer.preferences.travelers,
    durationDays: mem.customer.preferences.durationDays,
    isDomesticOnly: mem.customer.preferences.isDomesticOnly,
    customerName: mem.customer.name,
    customerPhone: mem.customer.phone,
    customerEmail: mem.customer.email,
    ambiguity: mem.conversation.lastAmbiguity ? [mem.conversation.lastAmbiguity] : (perception.ambiguity && perception.ambiguity.length > 0 ? perception.ambiguity : null),
    constraintConflict: mem.conversation.lastConflict || perception.constraintConflict || null,
    requirementMode: perception.destination?.relation === 'INFO_QUERY' ? 'EXPLORATORY' as const : (perception.budget ? perception.budget.mode : (perception.travelers ? perception.travelers.mode : 'ACTUAL_REQUIREMENT' as const))
  });

  // Helper for generating dynamic quick replies
  const getQuickReplies = (goal: string) =>
    generateQuickReplies({
      packages: TRAVEL_PACKAGES,
      availableDestinations,
      memory,
      goal,
      perception
    });

  // 4. Execution & Synthesis Phase by Goal

  // Goal: GREET
  if (plan.goal === 'GREET') {
    return {
      success: true,
      message: `Namaste! 🙏 Welcome to ${config.companyName}. I am ${config.name}, your ${config.role}. Where are you thinking of traveling, and what kind of experience are you dreaming of? We currently offer hand-crafted journeys across ${availableDestinations.join(', ')}.`,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'qualify_lead',
        input: memory.customer.preferences,
        output: { isQualified: false }
      }
    };
  }

  // Goal: RESOLVE_PAYMENT_INQUIRY
  if (plan.goal === 'RESOLVE_PAYMENT_INQUIRY') {
    return {
      success: true,
      message: `I cannot independently confirm your booking without automated verification from our payment gateway. If you completed a transaction, our backend will receive the cryptographic confirmation shortly and update your CRM dossier. Please ensure you have finalized the checkout modal or share your transaction reference ID so our human travel desk can assist.`,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'verify_payment_policy',
        input: { text: perception.latestUserText },
        output: { verified: false, requiresHmac: true }
      }
    };
  }

  // Goal: PREPARE_BOOKING_TOKEN (Custom token attempt)
  if (plan.goal === 'PREPARE_BOOKING_TOKEN' && perception.isCustomTokenAttempt) {
    const tokenResult = await prepareBookingTokenTool.execute({}, memory);
    return {
      success: true,
      message: `Our booking reservation token is fixed at ₹${tokenResult.tokenAmount} per our standard agency policy. This token is 100% refundable and serves to lock in your private villa allocation and chauffeur slots while our travel designer customizes your flights. The system cannot accept custom token amounts. Would you like to proceed with the standard ₹${tokenResult.tokenAmount} booking token?`,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: prepareBookingTokenTool.name,
        input: {},
        output: tokenResult
      }
    };
  }

  // Goal: HANDLE_UNSUPPORTED_DESTINATION
  if (plan.goal === 'HANDLE_UNSUPPORTED_DESTINATION') {
    const uncataloged = perception.requestedUncatalogedDestination || 'your requested destination';
    const escalation = await escalateToDeskTool.execute(
      {
        reason: `Destination ${uncataloged} not in active catalog`,
        destination: uncataloged
      },
      memory
    );

    return {
      success: true,
      message: `We do not currently offer travel packages for ${uncataloged}. Our official 2026 portfolio is curated exclusively for: ${availableDestinations.join(', ')}. Would you like to explore any of these destinations, or should I connect you with our bespoke private charter desk?`,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: escalateToDeskTool.name,
        input: { destination: uncataloged },
        output: escalation
      }
    };
  }

  // Goal: ANSWER_INFO_QUERY (Cat AA: e.g. "Is Goa expensive?", "Does Kashmir have snow?")
  if (plan.goal === 'ANSWER_INFO_QUERY') {
    const infoPrompt = `You are ${config.name}, ${config.role} at ${config.companyName}.
The traveler is asking an informational or general knowledge question: "${perception.latestUserText}".
DIRECTIVES:
1. Provide a knowledgeable, warm, and helpful answer to their question.
2. If the destination is in our official portfolio (${availableDestinations.join(', ')}), highlight what makes it special and ask if they'd like to explore itineraries there.
3. If the destination is outside our portfolio (like Goa or Daman), politely explain that our official portfolio focuses on ${availableDestinations.join(', ')}, but offer related alternatives.
4. DO NOT recommend or suggest specific package booking cards yet (suggestedPackages = []).
Keep your response warm, consultative, and concise (1-2 paragraphs).`;

    const assistantReply = await queryGroq(infoPrompt, messages);
    let fallbackReply = `That is a wonderful question! Regarding ${perception.latestUserText.trim().replace(/\?+$/, '')}, our official 2026 portfolio is curated exclusively across ${availableDestinations.join(', ')}. `;
    const qLower = perception.latestUserText.toLowerCase();
    if (qLower.includes('snow') || qLower.includes('kashmir')) {
      fallbackReply = `Yes! Kashmir, particularly Gulmarg, experiences magnificent snowfall and transforms into a magical winter wonderland typically from December through February. Our curated Kashmir journeys feature luxury heated stays, private gondola excursions, and traditional shikara rides. Would you like to explore a winter holiday in Kashmir?`;
    } else if (qLower.includes('goa')) {
      fallbackReply = `Goa offers a wide range of experiences, from bustling beach shacks to boutique luxury resorts. While Goa is not currently part of our official portfolio (${availableDestinations.join(', ')}), we curate world-class beach journeys in Bali, Kerala, and Phuket & Krabi! Would you like to explore those?`;
    } else if (qLower.includes('daman') || qLower.includes('devka')) {
      fallbackReply = `Devka Beach in Daman is known for its picturesque rocky shoreline and peaceful sunset walks. While Daman is not in our official luxury portfolio (${availableDestinations.join(', ')}), we offer spectacular coastal getaways in Kerala, Bali, and Phuket! Would you like to explore those?`;
    }

    const messageText = assistantReply || fallbackReply;
    memory.conversation.lastAssistantQuestion = messageText;

    return {
      success: true,
      message: messageText,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'qualify_lead',
        input: memory.customer.preferences,
        output: { isQualified: false, isInfoQuery: true }
      }
    };
  }

  // Goal: CLARIFY_AMBIGUITY (Cat C, U: e.g. "casino like LA", competing referents "that one")
  if (plan.goal === 'CLARIFY_AMBIGUITY') {
    const amb = (perception.ambiguity && perception.ambiguity.length > 0)
      ? perception.ambiguity[0]
      : memory.conversation.lastAmbiguity;

    const questionText = amb?.clarificationQuestion ||
      (amb?.candidates && amb.candidates.length > 0
        ? `Could you clarify which itinerary you are referring to? We previously explored: ${amb.candidates.join(' and ')}.`
        : `Could you kindly clarify your preference so our travel designers can best assist you?`);

    memory.conversation.lastAssistantQuestion = questionText;

    return {
      success: true,
      message: questionText,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'qualify_lead',
        input: memory.customer.preferences,
        output: { isQualified: false, ambiguity: amb }
      }
    };
  }

  // Goal: EXPLAIN_CONFLICT (Cat F: e.g. "Maldives under 10k")
  if (plan.goal === 'EXPLAIN_CONFLICT') {
    const conflict = perception.constraintConflict || memory.conversation.lastConflict;
    const explanationText = conflict?.explanation ||
      `We noticed a constraint conflict: ${conflict?.reason || 'your requested budget or duration is below our portfolio requirements'}. Would you like to consider expanding your budget, or exploring other destinations within our official portfolio (${availableDestinations.join(', ')})?`;

    memory.conversation.lastAssistantQuestion = explanationText;

    return {
      success: true,
      message: explanationText,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'qualify_lead',
        input: memory.customer.preferences,
        output: { isQualified: false, conflict }
      }
    };
  }

  // Goal: HANDLE_PRICE_OBJECTION
  if (plan.goal === 'HANDLE_PRICE_OBJECTION') {
    const objectionResult = await handlePriceObjectionTool.execute(undefined, memory);

    const objectionPrompt = `You are ${config.name}, ${config.role} at ${config.companyName}.
The traveler has stated that the pricing / packages offered are too high, too expensive, or beyond their budget.
YOUR DIRECTIVES:
1. Acknowledge their price sensitivity with warmth, consultative empathy, and respect.
2. Emphasize that ${config.companyName} can tailor experiences and explore diverse luxury price points.
3. Explicitly ask what budget per person they would be comfortable with for this journey.
4. DO NOT repeat, list, or suggest any package recommendations in this turn (suggestedPackages = []).
Keep your response warm, concise, and helpful (1-2 short paragraphs).`;

    const assistantReply = await queryGroq(objectionPrompt, messages);
    const fallbackReply = `I completely understand! We want to make sure your journey offers exceptional luxury while remaining comfortably within your budget. What budget per person would you be comfortable with for this trip? Once you share your target budget, I will immediately review our catalog to recommend options that align with your financial comfort.`;

    const objectionMsg = assistantReply || fallbackReply;
    memory.conversation.lastAssistantQuestion = objectionMsg;

    return {
      success: true,
      message: objectionMsg,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: handlePriceObjectionTool.name,
        input: {},
        output: objectionResult
      }
    };
  }

  // Goal: QUALIFY_LEAD
  if (plan.goal === 'QUALIFY_LEAD') {
    const hasInterests = memory.customer.preferences.interests.length > 0;
    const interestStr = hasInterests ? memory.customer.preferences.interests.join(' & ') : '';
    const styleStr = memory.customer.preferences.tripStyle || '';

    const askMissingPrompt = `You are ${config.name}, ${config.role} at ${config.companyName}.
The traveler is inquiring about travel, but key qualification details are missing.
- If inquiring about ${config.companyName}, introduce ${config.companyName} warmly as a premier luxury travel atelier curating private villa escapes across: ${availableDestinations.join(', ')}.
- If inquiring about an interest (like ${interestStr || 'scenic landscapes'}), acknowledge their interest warmly without assuming any honeymoon or milestone.
- If inquiring about a trip style (like ${styleStr}), acknowledge their style warmly.
- Inquire about their missing preferences:
  1. Preferred destination or region (or whether domestic India or international)
  2. Approximate budget per person
  3. Number of travelers and trip duration
CRITICAL RULES:
- DO NOT assume any destination (do NOT assume Bali or Kashmir).
- DO NOT assume any budget (do NOT assume ₹44,999 or ₹45,000).
- DO NOT assume any travelers.
- DO NOT use the word "milestone" unless the traveler explicitly mentioned wedding or honeymoon.
- DO NOT recommend or list catalog packages until qualified (suggestedPackages = []).
Keep your response warm, concise, and helpful (1-2 short paragraphs).`;

    const assistantReply = await queryGroq(askMissingPrompt, messages);

    let fallbackPrompt = '';
    if (
      latestLower.includes('wanderlust') ||
      latestLower.includes('who are you') ||
      latestLower.includes('about you') ||
      latestLower.includes('company')
    ) {
      fallbackPrompt = `Namaste! 🙏 ${config.companyName} is a premier bespoke travel atelier. We craft ultra-luxury private villa escapes, mountain retreats, and cultural journeys with dedicated chauffeurs, 5-star boutique stays, and VIP concierge access. Our official 2026 portfolio features hand-crafted journeys across ${availableDestinations.join(', ')}. How may I assist with your travel dreams today?`;
    } else if (hasInterests) {
      fallbackPrompt = `Namaste! 🙏 Experiencing ${interestStr} is a wonderful way to travel. To help our travel designers curate the perfect experience for you from our official portfolio (${availableDestinations.join(', ')}), could you kindly share:
1. Do you have a preferred destination in mind, or are you open to exploring domestic and international options?
2. What is your approximate budget per person?
3. How many travelers will be joining and for how many days?`;
    } else if (memory.customer.preferences.tripStyle) {
      fallbackPrompt = `Namaste! 🙏 A ${memory.customer.preferences.tripStyle} getaway is a wonderful journey. To help our travel designers curate the perfect experience for you from our official portfolio (${availableDestinations.join(', ')}), could you kindly share:
1. Do you have a preferred destination in mind, or are you open to domestic and international options?
2. What is your approximate budget per person?
3. How many travelers will be joining and for how many days?`;
    } else {
      fallbackPrompt = `Namaste! 🙏 To help our travel designers curate the ideal itinerary for you from our official portfolio (${availableDestinations.join(', ')}), could you kindly share:
1. Do you have a preferred destination in mind, or are you open to domestic and international journeys?
2. What is your approximate budget per person?
3. How many travelers will be joining and for how many days?`;
    }

    const qualifyMsg = assistantReply || fallbackPrompt;
    memory.conversation.lastAssistantQuestion = qualifyMsg;

    return {
      success: true,
      message: qualifyMsg,
      qualifyingPackages: [],
      alternativePackages: [],
      suggestedPackages: [],
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: qualifyLeadTool.name,
        input: memory.customer.preferences,
        output: { isQualified: false }
      }
    };
  }

  // Goal: RECOMMEND_PACKAGES or PREPARE_BOOKING_TOKEN
  const searchResult = await searchPackagesTool.execute(
    plan.action.parameters as SearchPackagesInput,
    memory
  );

  const qualifyingPackages = searchResult.qualifyingPackages;
  const alternativePackages = searchResult.alternativePackages;
  const topQualifying = qualifyingPackages.slice(0, 2);

  // =========================================================================
  // QUALIFYING PACKAGE INVARIANT ENFORCEMENT:
  // suggestedPackages MUST strictly reflect qualifyingPackages.
  // Under NO circumstances may an alternative package be promoted to suggestedPackages.
  // =========================================================================
  const suggestedPackages = topQualifying;

  // Case 1: Zero qualifying packages found (Hard constraints eliminated all packages)
  if (topQualifying.length === 0) {
    const dest = memory.customer.preferences.destination;
    const budget = memory.customer.preferences.budgetPerPerson;
    const budgetStr = budget ? `₹${budget.toLocaleString('en-IN')}` : '';

    let explanationMessage = '';
    if (dest && budget) {
      const destPkg = TRAVEL_PACKAGES.find(
        (p) => p.destination.toLowerCase().includes(dest.toLowerCase())
      );
      const startingRate = destPkg ? `₹${destPkg.pricePerPerson.toLocaleString('en-IN')}` : '₹38,500';
      explanationMessage = `We do not currently have a ${dest} package within ${budgetStr} per person. Our official ${dest} journey starts at ${startingRate} per person. Would you like to consider expanding your budget for ${dest}, or should we explore other beautiful destinations within ${budgetStr}?`;
    } else if (budget) {
      explanationMessage = `We do not currently have travel packages within ${budgetStr} per person. Our official curated journeys begin at ₹29,999 per person for Kerala Backwaters. Would you like to adjust your budget, or connect with our concierge desk for tailored options?`;
    } else {
      explanationMessage = `We could not find matching itineraries in our catalog for your exact criteria. Our official destinations include: ${availableDestinations.join(', ')}. Would you like to explore alternative options?`;
    }

    const noMatchMsg = explanationMessage;
    memory.conversation.lastAssistantQuestion = noMatchMsg;

    return {
      success: true,
      message: noMatchMsg,
      qualifyingPackages: [],
      alternativePackages,
      suggestedPackages: [], // strictly empty
      quickReplies: getQuickReplies(plan.goal),
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: plan.action.toolName,
        input: plan.action.parameters,
        output: searchResult
      }
    };
  }

  // Case 2: Qualifying packages exist
  const catalogSummary = topQualifying.map(
    (p) =>
      `- [${p.id}] ${p.name} | Dest: ${p.destination} (${p.country}) | ₹${p.pricePerPerson.toLocaleString('en-IN')}/pax | ${p.duration} | Highlights: ${p.highlights[0]}`
  ).join('\n');

  const systemPrompt = `You are ${config.name}, ${config.role} at ${config.companyName}.
PERSONALITY & STANDARDS:
- Warm, consultative, professional Indian hospitality.
- Never invent packages, prices, or destinations not in our official catalog.
- If the traveler's budget is lower than all packages, honestly inform them of our starting package rates.
- Do NOT match fixed scripts. Analyze what the traveler needs and answer dynamically.
- Mention: "You can secure your departure with a refundable ₹2,000 booking token, and our senior travel designer will contact you to finalize flights and custom details."
- If the traveler asks to book an option (e.g., "Can I book the second option?", "let's book option 2"): Confirm their choice warmly, ask for their name and mobile number, and invite them to click "Pay ₹2,000 Booking Token".
- Keep your response to 2-3 focused paragraphs.

QUALIFYING PACKAGES (ONLY THESE MAY BE RECOMMENDED):
${catalogSummary}

CURRENT CUSTOMER REQUIREMENTS (EXTRACTED):
- Destination: ${memory.customer.preferences.destination || 'Not specified (flexible)'}
- Flexibility: ${memory.customer.preferences.destinationFlexibility}
- Budget: ${memory.customer.preferences.budgetPerPerson ? '₹' + memory.customer.preferences.budgetPerPerson.toLocaleString('en-IN') + '/pax' : 'Not specified'}
- Travelers: ${memory.customer.preferences.travelers || 'Not specified'}
- Duration: ${memory.customer.preferences.durationDays ? memory.customer.preferences.durationDays + ' days' : 'Not specified'}
- Style: ${memory.customer.preferences.tripStyle || 'Not specified'}
- Interests: ${memory.customer.preferences.interests.join(', ') || 'None'}
- India Domestic Only: ${memory.customer.preferences.isDomesticOnly ? 'Yes' : 'No'}
`;

  let assistantText = await queryGroq(systemPrompt, messages);

  if (!assistantText) {
    if (perception.isBookingIntent) {
      const chosenPkg =
        perception.selectedOptionNumber === 2
          ? topQualifying[1] || topQualifying[0]
          : topQualifying[0];
      const pkgName = chosenPkg ? `**${chosenPkg.name}**` : 'your selected package';
      assistantText = `Wonderful decision! ${pkgName} is an extraordinary journey. You can confirm your dates by clicking the **Pay ₹2,000 Booking Token** button below. Once your token is confirmed via our secure Razorpay gateway, our senior concierge will connect with you to personalize flights and luxury inclusions. Please also share your full name and mobile number if you haven't already!`;
    } else {
      const listText = topQualifying
        .map(
          (p) =>
            `• **${p.name}** (${p.duration} — ₹${p.pricePerPerson.toLocaleString('en-IN')}/person)\n  *${p.description}*`
        )
        .join('\n\n');

      assistantText = `Based on your preferences, here are our recommended itineraries from our catalog:\n\n${listText}\n\nBoth include private accommodations and chauffeur transfers. You can reserve your departure with a refundable **₹2,000 booking token**, and our senior advisor will contact you to finalize flights and custom details. Which one would you prefer?`;
    }
  }

  memory.conversation.lastSurfacedPackages = topQualifying;
  memory.conversation.lastSurfacedOptions = topQualifying.map((p) => p.name);
  memory.conversation.lastAssistantQuestion = assistantText;

  return {
    success: true,
    message: assistantText,
    qualifyingPackages,
    alternativePackages,
    suggestedPackages, // Strictly qualifying
    quickReplies: getQuickReplies(plan.goal),
    extractedLead: getExtractedLead(memory),
    memory,
    executedTool: {
      toolName: plan.action.toolName,
      input: plan.action.parameters,
      output: searchResult
    }
  };
}
