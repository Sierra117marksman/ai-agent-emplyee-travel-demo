import urllib.request
import json
import sys
import os
import subprocess

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

def check(name, condition, details=''):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
        results.append((name, 'PASS', ''))
    else:
        failed += 1
        print(f"  [FAIL] {name} --> {details}")
        results.append((name, 'FAIL', details))

print("================================================================================")
print("RUNNING TEST SUITE: DYNAMIC QUICK REPLIES (ZERO HARDCODED BUSINESS VALUES)")
print("================================================================================")

# ==============================================================================
# SECTION 1: Source Code Anti-Hardcoding Audit
# ==============================================================================
print("\n--- 1. Anti-Hardcoding Code Audit ---")
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(rel_path):
    with open(os.path.join(project_root, rel_path), 'r', encoding='utf-8') as f:
        return f.read()

qr_code = read_file('src/lib/agent/quickReplies.ts')
widget_code = read_file('src/components/ArjunChatWidget.tsx')
engine_code = read_file('src/lib/agent/engine.ts')

# Assertions for quickReplies.ts
check("quickReplies.ts does not contain DEFAULT_DESTINATIONS", "DEFAULT_DESTINATIONS" not in qr_code)
check("quickReplies.ts does not fallback to ['Goa']", "['Goa'" not in qr_code and "[\"Goa\"" not in qr_code)
check("quickReplies.ts does not fallback to ['Bali']", "['Bali'" not in qr_code and "[\"Bali\"" not in qr_code)
check("quickReplies.ts does not fallback to ['Kashmir']", "['Kashmir'" not in qr_code and "[\"Kashmir\"" not in qr_code)
check("quickReplies.ts does not fallback to ['Kerala']", "['Kerala'" not in qr_code and "[\"Kerala\"" not in qr_code)

# Assertions for ArjunChatWidget.tsx
check("ArjunChatWidget.tsx does not contain static 'Bali Honeymoon' button", "Bali Honeymoon" not in widget_code)
check("ArjunChatWidget.tsx does not contain static 'Kashmir Houseboat' button", "Kashmir Houseboat" not in widget_code)
check("ArjunChatWidget.tsx does not contain static 'Under ₹40k' button", "Under ₹40k" not in widget_code)
check("ArjunChatWidget.tsx sends reply.value (not reply.label)", "String(reply.value)" in widget_code or "handleSendMessage(reply.value)" in widget_code or "handleSendMessage(String(reply.value))" in widget_code)
check("ArjunChatWidget.tsx handles free_text by focusing input", "reply.type === 'free_text'" in widget_code and "focus()" in widget_code)

# ==============================================================================
# SECTION 2: Initial Greeting Quick Replies (Dynamic Interests from Catalog)
# ==============================================================================
print("\n--- 2. Initial Greeting Quick Replies ---")
r_init = post_chat([])
qr_init = r_init.get('quickReplies', [])
check("Initial greeting returns quickReplies", len(qr_init) > 0, f"got {len(qr_init)}")

init_types = [q.get('type') for q in qr_init]
init_labels = [q.get('label') for q in qr_init]
init_values = [q.get('value') for q in qr_init]

check("Initial quick replies contain 'interest' chips", 'interest' in init_types, f"types: {init_types}")
check("Initial quick replies contain '🤷 Surprise Me'", any("Surprise Me" in l for l in init_labels))
check("Initial quick replies contain '💬 Type your own'", any("Type your own" in l for l in init_labels))

# Value vs Label distinction check: labels have icons, values are semantic strings
for q in qr_init:
    if q.get('type') == 'interest' and 'Surprise' not in q.get('label', ''):
        check(f"Value vs Label: '{q['label']}' label has emoji, value '{q['value']}' is clean semantic", 
              q['value'] != q['label'] and not any(ord(c) > 10000 for c in q['value']))

# ==============================================================================
# SECTION 3: Step-by-Step Progressive Discovery
# ==============================================================================
print("\n--- 3. Step-by-Step Progressive Discovery ---")

# Step 3A: Visitor selects interest "mountains" -> Quick replies should offer destination chips
r_mountains = post_chat([{'role': 'user', 'content': 'mountains'}])
lead_mountains = r_mountains.get('extractedLead', {})
qr_mountains = r_mountains.get('quickReplies', [])
m_types = [q.get('type') for q in qr_mountains]
m_labels = [q.get('label') for q in qr_mountains]

check("Interest 'mountains' is extracted in world state", 'mountains' in lead_mountains.get('interests', []))
check("Next question offers dynamic destination chips", 'destination' in m_types, f"types: {m_types}")
check("Kashmir (mountain destination) is offered in destination chips", any('Kashmir' in l for l in m_labels), f"labels: {m_labels}")
check("Includes '🌎 Anywhere' chip", any('Anywhere' in l for l in m_labels))
check("Includes '💬 Type a destination' chip", any('Type a destination' in l for l in m_labels))

# Step 3B: Visitor selects destination "Kashmir" -> Quick replies should offer traveler chips
r_kashmir = post_chat([
    {'role': 'user', 'content': 'mountains'},
    {'role': 'assistant', 'content': r_mountains.get('message', '')},
    {'role': 'user', 'content': 'Kashmir'}
])
lead_kashmir = r_kashmir.get('extractedLead', {})
qr_kashmir = r_kashmir.get('quickReplies', [])
k_types = [q.get('type') for q in qr_kashmir]
k_labels = [q.get('label') for q in qr_kashmir]
k_values = [q.get('value') for q in qr_kashmir]

check("Destination 'Kashmir' is extracted in world state", lead_kashmir.get('destination') == 'Kashmir')
check("Next question offers traveler chips", 'traveler_group' in k_types, f"types: {k_types}")
check("Traveler options include 'Couple' and 'Solo'", any('Couple' in l for l in k_labels) and any('Solo' in l for l in k_labels))

# Step 3C: Visitor selects traveler chip "❤️ Couple" (semantic value: "2 travelers") -> Quick replies should offer dynamic budget tiers
r_couple = post_chat([
    {'role': 'user', 'content': 'mountains'},
    {'role': 'assistant', 'content': r_mountains.get('message', '')},
    {'role': 'user', 'content': 'Kashmir'},
    {'role': 'assistant', 'content': r_kashmir.get('message', '')},
    {'role': 'user', 'content': '2 travelers'}
])
lead_couple = r_couple.get('extractedLead', {})
qr_couple = r_couple.get('quickReplies', [])
c_types = [q.get('type') for q in qr_couple]
c_values = [q.get('value') for q in qr_couple]

check("Travelers 2 is extracted in world state", lead_couple.get('travelers') == 2)
check("Next question offers dynamic budget chips", 'budget' in c_types, f"types: {c_types}")
check("Budget chip values end with 'per person'", all('per person' in v for v in c_values if 'type_budget' not in v))

# Step 3D: Visitor selects budget "40000 per person" -> System qualifies and recommends packages!
r_budget = post_chat([
    {'role': 'user', 'content': 'mountains'},
    {'role': 'assistant', 'content': r_mountains.get('message', '')},
    {'role': 'user', 'content': 'Kashmir'},
    {'role': 'assistant', 'content': r_kashmir.get('message', '')},
    {'role': 'user', 'content': '2 travelers'},
    {'role': 'assistant', 'content': r_couple.get('message', '')},
    {'role': 'user', 'content': '40000 per person'}
])
pkgs_rec = r_budget.get('suggestedPackages', [])
qr_rec = r_budget.get('quickReplies', [])
check("Recommendations produced for qualified customer", len(pkgs_rec) > 0, f"got {len(pkgs_rec)} pkgs")
check("Quick replies offer booking action chips for recommended package", 
      any('Token' in q.get('label', '') or 'Book' in q.get('label', '') for q in qr_rec),
      f"qr: {[q.get('label') for q in qr_rec]}")
check("Quick replies offer 'Explore other options'", any('other options' in q.get('label', '').lower() for q in qr_rec))

# ==============================================================================
# SECTION 4: Price Objection Flow Quick Replies
# ==============================================================================
print("\n--- 4. Price Objection Flow Quick Replies ---")
r_obj = post_chat([
    {'role': 'user', 'content': 'Kashmir for 2 people around 40k'},
    {'role': 'assistant', 'content': 'Here are options...'},
    {'role': 'user', 'content': 'Your price is too high'}
])
qr_obj = r_obj.get('quickReplies', [])
obj_types = [q.get('type') for q in qr_obj]
check("Price objection produces budget quick reply options", 'budget' in obj_types, f"types: {obj_types}")
check("Price objection includes '💬 Type your comfortable budget'", any('comfortable budget' in q.get('label', '').lower() for q in qr_obj))

# ==============================================================================
# SECTION 5: Ambiguity Clarification Flow Quick Replies
# ==============================================================================
print("\n--- 5. Ambiguity Flow Quick Replies ---")
r_amb = post_chat([
    {'role': 'user', 'content': 'I want casino like LA'}
])
qr_amb = r_amb.get('quickReplies', [])
check("Ambiguity turn returns quick replies for clarification", len(qr_amb) > 0)
check("Clarification includes type_own free text option", any(q.get('type') == 'free_text' for q in qr_amb))

# ==============================================================================
# SECTION 6: Unsupported Destination Flow Quick Replies
# ==============================================================================
print("\n--- 6. Unsupported Destination Flow Quick Replies ---")
r_unsupported = post_chat([
    {'role': 'user', 'content': 'I want a trip to Switzerland'}
])
qr_uns = r_unsupported.get('quickReplies', [])
uns_types = [q.get('type') for q in qr_uns]
uns_values = [q.get('value') for q in qr_uns]
check("Unsupported destination offers official portfolio destinations", 'destination' in uns_types, f"types: {uns_types}")
check("Offers private charter desk action chip", any('charter desk' in str(v).lower() for v in uns_values))

# ==============================================================================
# SECTION 7: Empty Catalog Rule (Zero Fake Destinations Invariant)
# ==============================================================================
print("\n--- 7. Empty Catalog Rule (via Unit Test Runner) ---")
unit_test_code = """
import { generateQuickReplies } from './src/lib/agent/quickReplies';

const emptyMemory = {
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
    missingFields: ['destination'],
    unsupportedDestination: null,
    turnCount: 0
  },
  business: {
    selectedPackageId: null,
    selectedPackageTitle: null,
    leadStatus: 'NEW',
    tokenOrderId: null,
    tokenPaymentId: null,
    tokenAmount: 2000
  }
};

const resultEmpty = generateQuickReplies({
  packages: [],
  availableDestinations: [],
  memory: emptyMemory,
  goal: 'QUALIFY_LEAD'
});

console.log(JSON.stringify(resultEmpty));
"""

script_path = os.path.join(project_root, 'test_empty_catalog.ts')
with open(script_path, 'w', encoding='utf-8') as f:
    f.write(unit_test_code)

res_proc = subprocess.run('npx tsx test_empty_catalog.ts', shell=True, capture_output=True, text=True, cwd=project_root)
if os.path.exists(script_path):
    os.remove(script_path)

if res_proc.returncode == 0:
    empty_chips = json.loads(res_proc.stdout.strip())
    check("Empty catalog produces exactly 1 chip", len(empty_chips) == 1, f"got {len(empty_chips)}")
    check("Empty catalog chip is free_text type", empty_chips[0].get('type') == 'free_text')
    check("Empty catalog NEVER uses fake fallback destinations", 'Goa' not in empty_chips[0].get('label') and 'Bali' not in empty_chips[0].get('label'))
else:
    check("Empty catalog test executed", False, res_proc.stderr)

# ==============================================================================
# SUMMARY
# ==============================================================================
print("\n================================================================================")
print(f"TOTAL: {passed}/{passed + failed} checks passed. ({failed} failed)")
print("================================================================================")
if failed == 0:
    print("ALL DYNAMIC QUICK REPLY TESTS PASSED PERFECTLY!")
    sys.exit(0)
else:
    sys.exit(1)
