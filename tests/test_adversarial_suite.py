import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def post_chat(msgs):
    data = json.dumps({'messages': msgs}).encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:3000/api/chat',
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode('utf-8'))

passed = 0
failed = 0
results = []

def check(cat, name, condition, details=''):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {cat}: {name}")
        results.append((cat, name, 'PASS', ''))
    else:
        failed += 1
        print(f"  [FAIL] {cat}: {name} --> {details}")
        results.append((cat, name, 'FAIL', details))

print("================================================================================")
print("RUNNING 27-CATEGORY (A through AA) ADVERSARIAL TEST SUITE")
print("================================================================================")

# ----------------------------------------------------------------------
# Category A: Pure Interests (Must never default destination)
# ----------------------------------------------------------------------
print("\n--- CATEGORY A: Pure Interests ---")
pure_interests = [
    ("I like mountains", "mountains"),
    ("I love beaches", "beaches"),
    ("I want snow", "snow"),
    ("I like wildlife", "wildlife"),
    ("I love nightlife", "nightlife"),
    ("I want casinos", "casinos"),
]
for query, expected_interest in pure_interests:
    r = post_chat([{'role': 'user', 'content': query}])
    lead = r.get('extractedLead', {})
    pkgs = r.get('suggestedPackages', [])
    interests = lead.get('interests', [])
    dest = lead.get('destination')
    check('Cat A', f"Interest '{expected_interest}' extracted for '{query}'", expected_interest in interests, f"got {interests}")
    check('Cat A', f"Destination is None for '{query}'", dest is None, f"got {dest}")
    check('Cat A', f"suggestedPackages empty for '{query}'", len(pkgs) == 0, f"got {len(pkgs)}")

# ----------------------------------------------------------------------
# Category B: Interest + Destination
# ----------------------------------------------------------------------
print("\n--- CATEGORY B: Interest + Destination ---")
r = post_chat([{'role': 'user', 'content': 'I want Kashmir mountains'}])
lead = r.get('extractedLead', {})
check('Cat B', "Kashmir mountains -> dest is Kashmir", lead.get('destination') == 'Kashmir', f"got {lead.get('destination')}")
check('Cat B', "Kashmir mountains -> interest mountains", 'mountains' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': 'I love Dubai nightlife'}])
lead = r.get('extractedLead', {})
check('Cat B', "Dubai nightlife -> dest is Dubai", lead.get('destination') == 'Dubai', f"got {lead.get('destination')}")
check('Cat B', "Dubai nightlife -> interest nightlife", 'nightlife' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': 'I want Kerala backwaters'}])
lead = r.get('extractedLead', {})
check('Cat B', "Kerala backwaters -> dest is Kerala", lead.get('destination') == 'Kerala', f"got {lead.get('destination')}")
check('Cat B', "Kerala backwaters -> interest backwaters", 'backwaters' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': 'I like Miami beaches'}])
lead = r.get('extractedLead', {})
check('Cat B', "Miami beaches -> dest is None (Miami uncataloged)", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat B', "Miami beaches -> interest beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")

# ----------------------------------------------------------------------
# Category C: Ambiguity
# ----------------------------------------------------------------------
print("\n--- CATEGORY C: Ambiguity ---")
r = post_chat([{'role': 'user', 'content': 'casino like LA'}])
lead = r.get('extractedLead', {})
check('Cat C', "casino like LA -> dest is None", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat C', "casino like LA -> interest is casinos", 'casinos' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat C', "casino like LA -> ambiguity triggered or clarification question asked", lead.get('ambiguity') is not None or 'angeles' in r.get('message', '').lower() or 'casino' in r.get('message', '').lower())

r = post_chat([{'role': 'user', 'content': 'something like Goa'}])
lead = r.get('extractedLead', {})
check('Cat C', "something like Goa -> dest is None", lead.get('destination') is None, f"got {lead.get('destination')}")

r = post_chat([{'role': 'user', 'content': 'beaches like Miami'}])
lead = r.get('extractedLead', {})
check('Cat C', "beaches like Miami -> dest is None", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat C', "beaches like Miami -> interest beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")

# ----------------------------------------------------------------------
# Category D: Negation
# ----------------------------------------------------------------------
print("\n--- CATEGORY D: Negation ---")
r = post_chat([{'role': 'user', 'content': "I don't want beaches"}])
lead = r.get('extractedLead', {})
check('Cat D', "don't want beaches -> excludedInterests contains beaches", 'beaches' in lead.get('excludedInterests', []), f"got {lead.get('excludedInterests')}")
check('Cat D', "don't want beaches -> interests does NOT contain beaches", 'beaches' not in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': "No mountains"}])
lead = r.get('extractedLead', {})
check('Cat D', "No mountains -> excludedInterests contains mountains", 'mountains' in lead.get('excludedInterests', []), f"got {lead.get('excludedInterests')}")

r = post_chat([{'role': 'user', 'content': "Anything except Goa"}])
lead = r.get('extractedLead', {})
check('Cat D', "Anything except Goa -> excludedDestinations contains Goa", any('goa' in d.lower() for d in lead.get('excludedDestinations', [])), f"got {lead.get('excludedDestinations')}")

r = post_chat([{'role': 'user', 'content': "I don't care about nightlife"}])
lead = r.get('extractedLead', {})
check('Cat D', "don't care about nightlife -> excludedInterests contains nightlife", 'nightlife' in lead.get('excludedInterests', []), f"got {lead.get('excludedInterests')}")

# ----------------------------------------------------------------------
# Category E: Multiple Interests
# ----------------------------------------------------------------------
print("\n--- CATEGORY E: Multiple Interests ---")
r = post_chat([{'role': 'user', 'content': "mountains and beaches"}])
lead = r.get('extractedLead', {})
check('Cat E', "mountains and beaches -> has mountains", 'mountains' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat E', "mountains and beaches -> has beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': "beach, beer and nightlife"}])
lead = r.get('extractedLead', {})
check('Cat E', "beach, beer, nightlife -> has beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat E', "beach, beer, nightlife -> has culinary", 'culinary' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat E', "beach, beer, nightlife -> has nightlife", 'nightlife' in lead.get('interests', []), f"got {lead.get('interests')}")

# ----------------------------------------------------------------------
# Category F: Contradictions
# ----------------------------------------------------------------------
print("\n--- CATEGORY F: Contradictions ---")
r = post_chat([{'role': 'user', 'content': "Maldives under 10k"}])
lead = r.get('extractedLead', {})
check('Cat F', "Maldives under 10k -> conflict detected or explained", lead.get('constraintConflict') is not None or '79,999' in r.get('message', '') or 'cannot' in r.get('message', '').lower())
check('Cat F', "Maldives under 10k -> suggestedPackages empty", len(r.get('suggestedPackages', [])) == 0)

r = post_chat([{'role': 'user', 'content': "luxury but super cheap"}])
lead = r.get('extractedLead', {})
check('Cat F', "luxury but super cheap -> conflict detected or handled", lead.get('constraintConflict') is not None or 'luxury' in r.get('message', '').lower())

r = post_chat([{'role': 'user', 'content': "snow and tropical beach"}])
lead = r.get('extractedLead', {})
check('Cat F', "snow and tropical beach -> logical conflict detected", lead.get('constraintConflict') is not None or 'different climates' in r.get('message', '').lower() or 'climate' in r.get('message', '').lower())

# ----------------------------------------------------------------------
# Category G: State Mutation
# ----------------------------------------------------------------------
print("\n--- CATEGORY G: State Mutation across turns ---")
dialog_g1 = [
    {'role': 'user', 'content': 'I want Kashmir.'},
    {'role': 'assistant', 'content': 'Wonderful choice. What is your budget?'},
    {'role': 'user', 'content': 'Actually Goa'}
]
r = post_chat(dialog_g1)
lead = r.get('extractedLead', {})
check('Cat G', "Kashmir -> Actually Goa -> destination is not Kashmir", lead.get('destination') != 'Kashmir', f"got {lead.get('destination')}")

dialog_g2 = [
    {'role': 'user', 'content': 'Kashmir 40k budget'},
    {'role': 'assistant', 'content': 'Understood. How many travelers?'},
    {'role': 'user', 'content': 'Actually 20k'}
]
r = post_chat(dialog_g2)
lead = r.get('extractedLead', {})
check('Cat G', "40k -> Actually 20k -> budget is 20000", lead.get('budgetPerPerson') == 20000, f"got {lead.get('budgetPerPerson')}")

dialog_g3 = [
    {'role': 'user', 'content': 'Kashmir for 2 people'},
    {'role': 'assistant', 'content': 'Great! What is your budget?'},
    {'role': 'user', 'content': 'Actually 4'}
]
r = post_chat(dialog_g3)
lead = r.get('extractedLead', {})
check('Cat G', "2 people -> Actually 4 -> travelers is 4", lead.get('travelers') == 4, f"got {lead.get('travelers')}")

# ----------------------------------------------------------------------
# Category H: Typos / Colloquial
# ----------------------------------------------------------------------
print("\n--- CATEGORY H: Typos / Colloquial ---")
r = post_chat([{'role': 'user', 'content': 'moutains'}])
lead = r.get('extractedLead', {})
check('Cat H', "moutains -> interest mountains", 'mountains' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': 'bech'}])
lead = r.get('extractedLead', {})
check('Cat H', "bech -> interest beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")

r = post_chat([{'role': 'user', 'content': 'kasmir 15k'}])
lead = r.get('extractedLead', {})
check('Cat H', "kasmir 15k -> dest Kashmir", lead.get('destination') == 'Kashmir', f"got {lead.get('destination')}")
check('Cat H', "kasmir 15k -> budget 15000", lead.get('budgetPerPerson') == 15000, f"got {lead.get('budgetPerPerson')}")

r = post_chat([{'role': 'user', 'content': '2 ppl'}])
lead = r.get('extractedLead', {})
check('Cat H', "2 ppl -> travelers 2", lead.get('travelers') == 2, f"got {lead.get('travelers')}")

r = post_chat([{'role': 'user', 'content': '15 thosand'}])
lead = r.get('extractedLead', {})
check('Cat H', "15 thosand -> budget 15000", lead.get('budgetPerPerson') == 15000, f"got {lead.get('budgetPerPerson')}")

# ----------------------------------------------------------------------
# Category I: Coreference
# ----------------------------------------------------------------------
print("\n--- CATEGORY I: Coreference ---")
dialog_i = [
    {'role': 'user', 'content': 'I want a luxury trip to Bali'},
    {'role': 'assistant', 'content': 'Bali Luxury Villa Escape is a magnificent journey with private pool villa.'},
    {'role': 'user', 'content': 'Somewhere like it, but quieter'}
]
r = post_chat(dialog_i)
lead = r.get('extractedLead', {})
check('Cat I', "Somewhere like it -> preserves context without crash", lead is not None)

# ----------------------------------------------------------------------
# Category J: Corrections
# ----------------------------------------------------------------------
print("\n--- CATEGORY J: Corrections ---")
r = post_chat([{'role': 'user', 'content': 'Kashmir. No sorry, I meant Manali'}])
lead = r.get('extractedLead', {})
check('Cat J', "Kashmir. No sorry, I meant Manali -> dest is not Kashmir", lead.get('destination') != 'Kashmir', f"got {lead.get('destination')}")

r = post_chat([{'role': 'user', 'content': "15k. Sorry that's per person, not total"}])
lead = r.get('extractedLead', {})
check('Cat J', "15k per person not total -> budget 15000", lead.get('budgetPerPerson') == 15000, f"got {lead.get('budgetPerPerson')}")

# ----------------------------------------------------------------------
# Category K: Temporal Expressions
# ----------------------------------------------------------------------
print("\n--- CATEGORY K: Temporal Expressions ---")
r = post_chat([{'role': 'user', 'content': 'next weekend'}])
lead = r.get('extractedLead', {})
check('Cat K', "next weekend -> travelers not corrupted", lead.get('travelers') is None, f"got {lead.get('travelers')}")
check('Cat K', "next weekend -> budget not corrupted", lead.get('budgetPerPerson') is None, f"got {lead.get('budgetPerPerson')}")

r = post_chat([{'role': 'user', 'content': 'trip in December for 5 days'}])
lead = r.get('extractedLead', {})
check('Cat K', "5 days -> durationDays 5", lead.get('durationDays') == 5, f"got {lead.get('durationDays')}")

# ----------------------------------------------------------------------
# Category L: Budget Semantics
# ----------------------------------------------------------------------
print("\n--- CATEGORY L: Budget Semantics ---")
r = post_chat([{'role': 'user', 'content': '50k for two'}])
lead = r.get('extractedLead', {})
check('Cat L', "50k for two -> budgetPerPerson is 25000", lead.get('budgetPerPerson') == 25000, f"got {lead.get('budgetPerPerson')}")

r = post_chat([{'role': 'user', 'content': '50k each'}])
lead = r.get('extractedLead', {})
check('Cat L', "50k each -> budgetPerPerson is 50000", lead.get('budgetPerPerson') == 50000, f"got {lead.get('budgetPerPerson')}")

r = post_chat([{'role': 'user', 'content': '40-50k per person'}])
lead = r.get('extractedLead', {})
check('Cat L', "40-50k per person -> budgetPerPerson is 50000", lead.get('budgetPerPerson') == 50000, f"got {lead.get('budgetPerPerson')}")

# ----------------------------------------------------------------------
# Category M: Traveler Semantics
# ----------------------------------------------------------------------
print("\n--- CATEGORY M: Traveler Semantics ---")
traveler_cases = [
    ("Just me", 1),
    ("Me and my wife", 2),
    ("Couple", 2),
    ("Me, wife and kid", 3),
    ("Family of four", 4),
    ("Two couples", 4),
]
for text_input, expected_count in traveler_cases:
    r = post_chat([{'role': 'user', 'content': text_input}])
    lead = r.get('extractedLead', {})
    check('Cat M', f"'{text_input}' -> travelers is {expected_count}", lead.get('travelers') == expected_count, f"got {lead.get('travelers')}")

# ----------------------------------------------------------------------
# Category N: Attraction Hierarchy
# ----------------------------------------------------------------------
print("\n--- CATEGORY N: Attraction Hierarchy ---")
attraction_cases = [
    ("Burj Khalifa", "Dubai"),
    ("Gulmarg", "Kashmir"),
    ("Alleppey", "Kerala"),
    ("Seminyak", "Bali"),
]
for attr, expected_dest in attraction_cases:
    r = post_chat([{'role': 'user', 'content': f"I want to see {attr}"}])
    lead = r.get('extractedLead', {})
    check('Cat N', f"Attraction '{attr}' maps to '{expected_dest}'", lead.get('destination') == expected_dest, f"got {lead.get('destination')}")

# Uncataloged attractions
r = post_chat([{'role': 'user', 'content': 'I want to see Taj Mahal'}])
lead = r.get('extractedLead', {})
check('Cat N', "Taj Mahal -> dest not in catalog (Agra)", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat N', "Taj Mahal -> suggestedPackages empty", len(r.get('suggestedPackages', [])) == 0)

# ----------------------------------------------------------------------
# Category O: Package References
# ----------------------------------------------------------------------
print("\n--- CATEGORY O: Package References ---")
dialog_o = [
    {'role': 'user', 'content': 'Kashmir 40k budget 2 people 5 days'},
    {'role': 'assistant', 'content': 'We have Kashmir Valley & Houseboat Bliss (₹38,500/person).'},
    {'role': 'user', 'content': 'Can I book the second option?'}
]
r = post_chat(dialog_o)
check('Cat O', "Can I book second option -> acknowledged booking flow", 'book' in r.get('message', '').lower() or 'token' in r.get('message', '').lower() or r.get('memory', {}).get('conversation', {}).get('currentIntent') == 'CHECKOUT')

# ----------------------------------------------------------------------
# Category P: Comparisons
# ----------------------------------------------------------------------
print("\n--- CATEGORY P: Comparisons ---")
r = post_chat([{'role': 'user', 'content': 'Cheaper than Kashmir'}])
lead = r.get('extractedLead', {})
check('Cat P', "Cheaper than Kashmir -> dest is None", lead.get('destination') is None, f"got {lead.get('destination')}")

r = post_chat([{'role': 'user', 'content': 'Less crowded than Goa'}])
lead = r.get('extractedLead', {})
check('Cat P', "Less crowded than Goa -> dest is None", lead.get('destination') is None, f"got {lead.get('destination')}")

# ----------------------------------------------------------------------
# Category Q: Preference Strength
# ----------------------------------------------------------------------
print("\n--- CATEGORY Q: Preference Strength ---")
r = post_chat([{'role': 'user', 'content': "I'd prefer mountains"}])
lead = r.get('extractedLead', {})
check('Cat Q', "I'd prefer mountains -> interest mountains", 'mountains' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat Q', "I'd prefer mountains -> destination is None", lead.get('destination') is None)

# ----------------------------------------------------------------------
# Category R: Unknown / Undecided State
# ----------------------------------------------------------------------
print("\n--- CATEGORY R: Unknown / Undecided State ---")
r = post_chat([{'role': 'user', 'content': "I don't know"}])
lead = r.get('extractedLead', {})
check('Cat R', "I don't know -> destination is None", lead.get('destination') is None)
check('Cat R', "I don't know -> budget is None", lead.get('budgetPerPerson') is None)

r = post_chat([{'role': 'user', 'content': "Not sure about budget"}])
lead = r.get('extractedLead', {})
check('Cat R', "Not sure about budget -> budget is None", lead.get('budgetPerPerson') is None)

# ----------------------------------------------------------------------
# Category S: Multi-Turn State Attacks
# ----------------------------------------------------------------------
print("\n--- CATEGORY S: Multi-Turn State Attacks ---")
dialog_s = [
    {'role': 'user', 'content': 'I want a honeymoon trip to Kashmir for 50k per person, 2 travelers for 6 days.'},
    {'role': 'assistant', 'content': 'Here is our Kashmir Valley & Houseboat Bliss.'},
    {'role': 'user', 'content': 'Actually, change that to Kerala.'},
    {'role': 'assistant', 'content': 'Switched to Kerala. What budget are you targeting?'},
    {'role': 'user', 'content': 'Make it 30k each for 3 people, and 5 days.'}
]
r = post_chat(dialog_s)
lead = r.get('extractedLead', {})
check('Cat S', "Multi-turn attack -> dest is Kerala", lead.get('destination') == 'Kerala', f"got {lead.get('destination')}")
check('Cat S', "Multi-turn attack -> budget is 30000", lead.get('budgetPerPerson') == 30000, f"got {lead.get('budgetPerPerson')}")
check('Cat S', "Multi-turn attack -> travelers is 3", lead.get('travelers') == 3, f"got {lead.get('travelers')}")
check('Cat S', "Multi-turn attack -> durationDays is 5", lead.get('durationDays') == 5, f"got {lead.get('durationDays')}")

# ----------------------------------------------------------------------
# Category T: Adversarial Stereotype Traps
# ----------------------------------------------------------------------
print("\n--- CATEGORY T: Adversarial Stereotype Traps ---")
r = post_chat([{'role': 'user', 'content': 'I want the best beer at a beach'}])
lead = r.get('extractedLead', {})
check('Cat T', "Best beer at a beach -> dest is None (NOT Goa)", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat T', "Best beer at a beach -> interests has beaches", 'beaches' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat T', "Best beer at a beach -> suggestedPackages empty", len(r.get('suggestedPackages', [])) == 0)

r = post_chat([{'role': 'user', 'content': 'I want casinos'}])
lead = r.get('extractedLead', {})
check('Cat T', "I want casinos -> dest is None (NOT Goa or Vegas)", lead.get('destination') is None, f"got {lead.get('destination')}")

r = post_chat([{'role': 'user', 'content': 'I want snow'}])
lead = r.get('extractedLead', {})
check('Cat T', "I want snow -> dest is None (NOT Kashmir)", lead.get('destination') is None, f"got {lead.get('destination')}")

r = post_chat([{'role': 'user', 'content': 'I want luxury shopping'}])
lead = r.get('extractedLead', {})
check('Cat T', "I want luxury shopping -> dest is None (NOT Dubai)", lead.get('destination') is None, f"got {lead.get('destination')}")

# ----------------------------------------------------------------------
# Category U: Ambiguous Pronouns with Competing Referents
# ----------------------------------------------------------------------
print("\n--- CATEGORY U: Ambiguous Pronouns with Competing Referents ---")
dialog_u = [
    {'role': 'user', 'content': 'I want mountains or beach for 40k, 2 people 5 days'},
    {'role': 'assistant', 'content': 'We have two magnificent options: Bali Tropical Heritage & Beaches and Kashmir Valley & Houseboat Bliss.'},
    {'role': 'user', 'content': 'I like that one.'}
]
r = post_chat(dialog_u)
lead = r.get('extractedLead', {})
msg = r.get('message', '').lower()
check('Cat U', "Competing referents ('that one') -> triggers clarification", 'clarify' in msg or 'which' in msg or lead.get('ambiguity') is not None, f"msg: {msg[:100]}")
check('Cat U', "Competing referents -> does not blindly pick Bali or Kashmir", lead.get('destination') is None or lead.get('ambiguity') is not None)

# ----------------------------------------------------------------------
# Category V: Mixed Positive + Negative Constraints
# ----------------------------------------------------------------------
print("\n--- CATEGORY V: Mixed Positive + Negative Constraints ---")
r = post_chat([{'role': 'user', 'content': 'I want mountains, but no snow'}])
lead = r.get('extractedLead', {})
check('Cat V', "mountains but no snow -> interest mountains", 'mountains' in lead.get('interests', []), f"got {lead.get('interests')}")
check('Cat V', "mountains but no snow -> excludedInterests snow", 'snow' in lead.get('excludedInterests', []), f"got {lead.get('excludedInterests')}")

# ----------------------------------------------------------------------
# Category W: Scope Ambiguity
# ----------------------------------------------------------------------
print("\n--- CATEGORY W: Scope Ambiguity ---")
r = post_chat([{'role': 'user', 'content': '50k for two, but 50k each for hotels'}])
lead = r.get('extractedLead', {})
check('Cat W', "Scope ambiguity -> budget calculated reasonably", lead.get('budgetPerPerson') in [25000, 50000], f"got {lead.get('budgetPerPerson')}")

r = post_chat([{'role': 'user', 'content': 'Kashmir for 20k, flights separate'}])
lead = r.get('extractedLead', {})
check('Cat W', "flights separate -> land package budget 20000", lead.get('budgetPerPerson') == 20000, f"got {lead.get('budgetPerPerson')}")

# ----------------------------------------------------------------------
# Category X: Ellipsis / Contextual Slot-Filling
# ----------------------------------------------------------------------
print("\n--- CATEGORY X: Ellipsis / Contextual Slot-Filling ---")
dialog_x1 = [
    {'role': 'user', 'content': 'I want to go to Kashmir.'},
    {'role': 'assistant', 'content': 'Wonderful! How many days are you planning to travel?'},
    {'role': 'user', 'content': 'Four'}
]
r = post_chat(dialog_x1)
lead = r.get('extractedLead', {})
check('Cat X', "Assistant asked duration -> 'Four' resolves to durationDays = 4", lead.get('durationDays') == 4, f"got {lead.get('durationDays')}")
check('Cat X', "Assistant asked duration -> 'Four' does NOT set travelers = 4", lead.get('travelers') != 4, f"got {lead.get('travelers')}")

dialog_x2 = [
    {'role': 'user', 'content': 'I want to go to Kashmir.'},
    {'role': 'assistant', 'content': 'How many travelers will be joining?'},
    {'role': 'user', 'content': 'Two'}
]
r = post_chat(dialog_x2)
lead = r.get('extractedLead', {})
check('Cat X', "Assistant asked travelers -> 'Two' resolves to travelers = 2", lead.get('travelers') == 2, f"got {lead.get('travelers')}")
check('Cat X', "Assistant asked travelers -> 'Two' does NOT set durationDays = 2", lead.get('durationDays') != 2, f"got {lead.get('durationDays')}")

dialog_x3 = [
    {'role': 'user', 'content': 'I want to go to Kashmir.'},
    {'role': 'assistant', 'content': 'What is your approximate budget per person?'},
    {'role': 'user', 'content': '20k'}
]
r = post_chat(dialog_x3)
lead = r.get('extractedLead', {})
check('Cat X', "Assistant asked budget -> '20k' resolves to budgetPerPerson = 20000", lead.get('budgetPerPerson') == 20000, f"got {lead.get('budgetPerPerson')}")

# ----------------------------------------------------------------------
# Category Y: Self-Contradiction Inside One Message
# ----------------------------------------------------------------------
print("\n--- CATEGORY Y: Self-Contradiction Inside One Message ---")
r = post_chat([{'role': 'user', 'content': 'Two people, actually three'}])
lead = r.get('extractedLead', {})
check('Cat Y', "Two people, actually three -> travelers is 3", lead.get('travelers') == 3, f"got {lead.get('travelers')}")

r = post_chat([{'role': 'user', 'content': 'I want only Kashmir, actually anywhere is fine'}])
lead = r.get('extractedLead', {})
check('Cat Y', "only Kashmir, actually anywhere is fine -> destinationFlexibility is 'yes'", lead.get('destinationFlexibility') == 'yes', f"got {lead.get('destinationFlexibility')}")

# ----------------------------------------------------------------------
# Category Z: Hypothetical / Exploratory Language
# ----------------------------------------------------------------------
print("\n--- CATEGORY Z: Hypothetical / Exploratory Language ---")
r = post_chat([{'role': 'user', 'content': 'If I had 50k, what could I get?'}])
lead = r.get('extractedLead', {})
check('Cat Z', "If I had 50k -> requirementMode is HYPOTHETICAL", lead.get('requirementMode') == 'HYPOTHETICAL' or lead.get('budgetPerPerson') is None, f"got mode: {lead.get('requirementMode')}, budget: {lead.get('budgetPerPerson')}")
check('Cat Z', "If I had 50k -> does NOT lock hard budget as unqualified gate satisfied", len(r.get('suggestedPackages', [])) == 0)

# ----------------------------------------------------------------------
# Category AA: Mentioned Entity as Information Query
# ----------------------------------------------------------------------
print("\n--- CATEGORY AA: Mentioned Entity as Information Query ---")
r = post_chat([{'role': 'user', 'content': 'Is Goa expensive?'}])
lead = r.get('extractedLead', {})
check('Cat AA', "Is Goa expensive? -> target destination is None", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat AA', "Is Goa expensive? -> suggestedPackages empty", len(r.get('suggestedPackages', [])) == 0)
check('Cat AA', "Is Goa expensive? -> answers the question or consultative response", len(r.get('message', '')) > 20)

r = post_chat([{'role': 'user', 'content': 'Does Kashmir have snow?'}])
lead = r.get('extractedLead', {})
check('Cat AA', "Does Kashmir have snow? -> target destination is None", lead.get('destination') is None, f"got {lead.get('destination')}")
check('Cat AA', "Does Kashmir have snow? -> suggestedPackages empty", len(r.get('suggestedPackages', [])) == 0)

# ----------------------------------------------------------------------
# META-SEMANTIC INVARIANCE
# ----------------------------------------------------------------------
print("\n--- META-SEMANTIC INVARIANCE (6 Phrasing Variations for Mountains) ---")
variations = [
    "I want to see mountains",
    "Looking for a mountain vacation",
    "I love mountains",
    "Mountains please",
    "Interested in mountains",
    "Show me mountainous getaways"
]
for var in variations:
    r = post_chat([{'role': 'user', 'content': var}])
    lead = r.get('extractedLead', {})
    pkgs = r.get('suggestedPackages', [])
    interests = lead.get('interests', [])
    dest = lead.get('destination')
    check('Meta', f"Variation '{var}' -> interest 'mountains'", 'mountains' in interests, f"got {interests}")
    check('Meta', f"Variation '{var}' -> dest is None", dest is None, f"got {dest}")
    check('Meta', f"Variation '{var}' -> packages empty", len(pkgs) == 0, f"got {len(pkgs)}")

# ----------------------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------------------
print("\n================================================================================")
print(f"ADVERSARIAL SUITE TOTAL: {passed}/{passed + failed} checks passed.")
if failed == 0:
    print("ALL 27 CATEGORIES + META-SEMANTIC INVARIANCE PASSED 100%!")
else:
    print(f"ATTENTION: {failed} checks failed. See breakdown above.")
print("================================================================================")
