import {
  TRAVEL_PACKAGES,
  TravelPackage
} from '@/lib/packages';
import {
  AgentConfig,
  AgentTurnResult,
  AgentMemory
} from './types';
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
    return {
      success: true,
      message: `Namaste! 🙏 Welcome to ${config.companyName}. I am ${config.name}, your ${config.role}. Where are you thinking of traveling, and what kind of trip are you dreaming of? We currently offer curated journeys across ${availableDestinations.join(', ')}.`,
      suggestedPackages: [],
      extractedLead: {
        destination: null,
        budgetPerPerson: null,
        travelers: null,
        durationDays: null,
        tripStyle: null,
        isDomesticOnly: false
      },
      memory: {
        customer: {
          name: null,
          phone: null,
          email: null,
          preferences: {
            destination: null,
            budgetPerPerson: null,
            travelers: null,
            durationDays: null,
            tripStyle: null,
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
      }
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
    destination: mem.customer.preferences.destination,
    budgetPerPerson: mem.customer.preferences.budgetPerPerson,
    travelers: mem.customer.preferences.travelers,
    durationDays: mem.customer.preferences.durationDays,
    isDomesticOnly: mem.customer.preferences.isDomesticOnly,
    customerName: mem.customer.name,
    customerPhone: mem.customer.phone,
    customerEmail: mem.customer.email
  });

  // 4. Execution & Synthesis Phase by Goal

  // Goal A: RESOLVE_PAYMENT_INQUIRY
  if (plan.goal === 'RESOLVE_PAYMENT_INQUIRY') {
    return {
      success: true,
      message: `I cannot independently confirm your booking without automated verification from our payment gateway. If you completed a transaction, our backend will receive the cryptographic confirmation shortly and update your CRM dossier. Please ensure you have finalized the checkout modal or share your transaction reference ID so our human travel desk can assist.`,
      suggestedPackages: [],
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: 'verify_payment_policy',
        input: { text: perception.latestUserText },
        output: { verified: false, requiresHmac: true }
      }
    };
  }

  // Goal B: PREPARE_BOOKING_TOKEN (Custom token attempt)
  if (plan.goal === 'PREPARE_BOOKING_TOKEN' && perception.isCustomTokenAttempt) {
    const tokenResult = await prepareBookingTokenTool.execute({}, memory);
    return {
      success: true,
      message: `Our booking reservation token is fixed at ₹${tokenResult.tokenAmount} per our standard agency policy. This token is 100% refundable and serves to lock in your private villa allocation and chauffeur slots while our travel designer customizes your flights. The system cannot accept custom token amounts. Would you like to proceed with the standard ₹${tokenResult.tokenAmount} booking token?`,
      suggestedPackages: [],
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: prepareBookingTokenTool.name,
        input: {},
        output: tokenResult
      }
    };
  }

  // Goal C: HANDLE_UNSUPPORTED_DESTINATION
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
      suggestedPackages: [],
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: escalateToDeskTool.name,
        input: { destination: uncataloged },
        output: escalation
      }
    };
  }

  // Goal D: HANDLE_PRICE_OBJECTION
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

    return {
      success: true,
      message: assistantReply || fallbackReply,
      suggestedPackages: [],
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: handlePriceObjectionTool.name,
        input: {},
        output: objectionResult
      }
    };
  }

  // Goal E: QUALIFY_LEAD (Qualification Gate - BUG 1)
  if (plan.goal === 'QUALIFY_LEAD') {
    const styleWord = memory.customer.preferences.tripStyle ? ` ${memory.customer.preferences.tripStyle}` : '';
    const askMissingPrompt = `You are ${config.name}, ${config.role} at ${config.companyName}.
The traveler is inquiring about travel, but key qualification details are missing.
- If inquiring about ${config.companyName}, introduce ${config.companyName} warmly as a premier luxury travel atelier curating private villa escapes across: ${availableDestinations.join(', ')}.
- If inquiring about a trip, warmly acknowledge their interest in a${styleWord} journey.
- Inquire about their missing preferences:
  1. Preferred destination or region (or whether domestic India or international)
  2. Approximate budget per person
  3. Number of travelers and trip duration
CRITICAL RULES:
- DO NOT assume any destination (do NOT assume Bali or Kashmir).
- DO NOT assume any budget (do NOT assume ₹44,999 or ₹45,000).
- DO NOT assume 2 travelers.
- DO NOT recommend or list catalog packages until qualified (suggestedPackages = []).
Keep your response warm, concise, and helpful (1-2 short paragraphs).`;

    const assistantReply = await queryGroq(askMissingPrompt, messages);
    let fallbackPrompt = `Namaste! 🙏 A${styleWord} getaway is a truly wonderful milestone. To help our travel designers curate the perfect experience for you from our official portfolio (${availableDestinations.join(', ')}), could you kindly share:
1. Do you have a preferred destination in mind, or are you open to domestic and international journeys?
2. What is your approximate budget per person?
3. How many travelers will be joining and for how many days?`;

    if (
      latestLower.includes('wanderlust') ||
      latestLower.includes('who are you') ||
      latestLower.includes('about you') ||
      latestLower.includes('company')
    ) {
      fallbackPrompt = `Namaste! 🙏 ${config.companyName} is a premier bespoke travel atelier. We craft ultra-luxury private villa escapes, mountain retreats, and cultural journeys with dedicated chauffeurs, 5-star boutique stays, and VIP concierge access. Our official 2026 portfolio features hand-crafted journeys across ${availableDestinations.join(', ')}. How may I assist with your travel dreams today?`;
    }

    return {
      success: true,
      message: assistantReply || fallbackPrompt,
      suggestedPackages: [],
      extractedLead: getExtractedLead(memory),
      memory,
      executedTool: {
        toolName: qualifyLeadTool.name,
        input: memory.customer.preferences,
        output: { isQualified: false }
      }
    };
  }

  // Goal F & G: RECOMMEND_PACKAGES or PREPARE_BOOKING_TOKEN
  const searchResult: TravelPackage[] = await searchPackagesTool.execute(
    plan.action.parameters as SearchPackagesInput,
    memory
  );

  const matchedPackages = searchResult;
  const topPackages = matchedPackages.slice(0, 2);

  const catalogSummary = TRAVEL_PACKAGES.map(
    (p) =>
      `- [${p.id}] ${p.name} | Dest: ${p.destination} (${p.country}) | ₹${p.pricePerPerson.toLocaleString('en-IN')}/pax | ${p.duration} | Suitable: ${p.suitableFor.join(', ')} | Highlights: ${p.highlights[0]}`
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

CURRENT OFFICIAL CATALOG:
${catalogSummary}

CURRENT CUSTOMER REQUIREMENTS (EXTRACTED):
- Destination: ${memory.customer.preferences.destination || 'Not specified yet'}
- Budget: ${memory.customer.preferences.budgetPerPerson ? '₹' + memory.customer.preferences.budgetPerPerson.toLocaleString('en-IN') + '/pax' : 'Not specified'}
- Travelers: ${memory.customer.preferences.travelers || 'Not specified'}
- Duration: ${memory.customer.preferences.durationDays ? memory.customer.preferences.durationDays + ' days' : 'Not specified'}
- Style: ${memory.customer.preferences.tripStyle || 'Not specified'}
- India Domestic Only: ${memory.customer.preferences.isDomesticOnly ? 'Yes' : 'No'}
- Exclude: ${memory.customer.preferences.excludePackageId || 'None'}
`;

  let assistantText = await queryGroq(systemPrompt, messages);

  if (!assistantText) {
    if (perception.isBookingIntent) {
      const chosenPkg =
        perception.selectedOptionNumber === 2
          ? matchedPackages[1] || matchedPackages[0]
          : matchedPackages[0];
      const pkgName = chosenPkg ? `**${chosenPkg.name}**` : 'your selected package';
      assistantText = `Wonderful decision! ${pkgName} is an extraordinary journey. You can confirm your dates by clicking the **Pay ₹2,000 Booking Token** button below. Once your token is confirmed via our secure Razorpay gateway, our senior concierge will connect with you to personalize flights and luxury inclusions. Please also share your full name and mobile number if you haven't already!`;
    } else if (topPackages.length > 0) {
      const listText = topPackages
        .map(
          (p) =>
            `• **${p.name}** (${p.duration} — ₹${p.pricePerPerson.toLocaleString('en-IN')}/person)\n  *${p.description}*`
        )
        .join('\n\n');

      assistantText = `Based on your preferences, here are our recommended itineraries from our catalog:\n\n${listText}\n\nBoth include private accommodations and chauffeur transfers. You can reserve your departure with a refundable **₹2,000 booking token**, and our senior advisor will contact you to finalize flights and custom details. Which one would you prefer?`;
    } else {
      assistantText = `I would love to help you plan your journey! To find the best options in our portfolio (${availableDestinations.join(', ')}), could you share your approximate budget per person, number of travelers, and preferred style of trip?`;
    }
  }

  return {
    success: true,
    message: assistantText,
    suggestedPackages: topPackages,
    extractedLead: getExtractedLead(memory),
    memory,
    executedTool: {
      toolName: plan.action.toolName,
      input: plan.action.parameters,
      output: searchResult
    }
  };
}
