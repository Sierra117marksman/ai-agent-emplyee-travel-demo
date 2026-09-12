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
total = 0

def check(name, condition, extra=''):
    global passed, total
    total += 1
    if condition:
        passed += 1
        print(f"PASS: {name}")
    else:
        print(f"FAIL: {name} | {extra}")

print("==================================================")
print("TEST SUITE: BUG 1 REGRESSION TESTS (Qualification Gate)")
print("==================================================")

# 1. Exact scenario: 'I want a honeymoon trip.'
r = post_chat([{'role': 'user', 'content': 'I want a honeymoon trip.'}])
lead = r.get('extractedLead', {})
pkgs = r.get('suggestedPackages', [])
check("Bug 1 Single - tripStyle is honeymoon", lead.get('tripStyle') == 'honeymoon', f"got {lead.get('tripStyle')}")
check("Bug 1 Single - destination is None", lead.get('destination') is None, f"got {lead.get('destination')}")
check("Bug 1 Single - budgetPerPerson is None", lead.get('budgetPerPerson') is None, f"got {lead.get('budgetPerPerson')}")
check("Bug 1 Single - travelers is None", lead.get('travelers') is None, f"got {lead.get('travelers')}")
check("Bug 1 Single - durationDays is None", lead.get('durationDays') is None, f"got {lead.get('durationDays')}")
check("Bug 1 Single - suggestedPackages is empty []", len(pkgs) == 0, f"got {len(pkgs)} packages")
check("Bug 1 Single - asks for missing info", 'budget' in r.get('message', '').lower() or 'destination' in r.get('message', '').lower())

# 2. Variations of Bug 1:
variations = [
    "I want a honeymoon.",
    "We're planning our honeymoon.",
    "Looking for a honeymoon getaway."
]
for v in variations:
    rv = post_chat([{'role': 'user', 'content': v}])
    l = rv.get('extractedLead', {})
    p = rv.get('suggestedPackages', [])
    check(f"Variation '{v}' - tripStyle honeymoon", l.get('tripStyle') == 'honeymoon')
    check(f"Variation '{v}' - budget is None", l.get('budgetPerPerson') is None)
    check(f"Variation '{v}' - packages empty", len(p) == 0)

# 3. Bug 1 in Multi-turn after an adventure inquiry
multi_turn_b1 = [
    {'role': 'user', 'content': 'We are looking for an adventure trip somewhere in India for 4 people with ₹35k budget.'},
    {'role': 'assistant', 'content': 'Here are options...'},
    {'role': 'user', 'content': 'I want a honeymoon trip.'}
]
r_mt1 = post_chat(multi_turn_b1)
l_mt1 = r_mt1.get('extractedLead', {})
p_mt1 = r_mt1.get('suggestedPackages', [])
check("Multi-turn Bug 1 - tripStyle reset to honeymoon", l_mt1.get('tripStyle') == 'honeymoon', f"got {l_mt1.get('tripStyle')}")
check("Multi-turn Bug 1 - destination is None", l_mt1.get('destination') is None, f"got {l_mt1.get('destination')}")
check("Multi-turn Bug 1 - budgetPerPerson NOT leaked (None)", l_mt1.get('budgetPerPerson') is None, f"got {l_mt1.get('budgetPerPerson')}")
check("Multi-turn Bug 1 - travelers NOT leaked (None)", l_mt1.get('travelers') is None, f"got {l_mt1.get('travelers')}")
check("Multi-turn Bug 1 - suggestedPackages is empty []", len(p_mt1) == 0, f"got {len(p_mt1)} packages")

print("\n==================================================")
print("TEST SUITE: BUG 2 REGRESSION TESTS (Price Objection)")
print("==================================================")

# 4. Multi-turn Bug 2: Price objection after recommendations
multi_turn_b2_turn1 = [
    {'role': 'user', 'content': 'We are looking for an adventure trip somewhere in India for 4 people with ₹35k budget for 5 days.'}
]
r_b2_t1 = post_chat(multi_turn_b2_turn1)
p_b2_t1 = r_b2_t1.get('suggestedPackages', [])
check("Bug 2 Turn 1 - produces recommendations", len(p_b2_t1) > 0)

# Turn 2: 'your price is too high'
multi_turn_b2_turn2 = [
    {'role': 'user', 'content': 'We are looking for an adventure trip somewhere in India for 4 people with ₹35k budget for 5 days.'},
    {'role': 'assistant', 'content': r_b2_t1.get('message', '')},
    {'role': 'user', 'content': 'your price is too high'}
]
r_b2_t2 = post_chat(multi_turn_b2_turn2)
p_b2_t2 = r_b2_t2.get('suggestedPackages', [])
msg_t2 = r_b2_t2.get('message', '').lower()
check("Bug 2 Turn 2 - DOES NOT repeat recommendations", len(p_b2_t2) == 0, f"got {len(p_b2_t2)}")
check("Bug 2 Turn 2 - asks for comfortable budget", 'budget' in msg_t2 and ('comfortable' in msg_t2 or 'share' in msg_t2 or 'mind' in msg_t2 or 'per person' in msg_t2), f"msg: {msg_t2}")

# Turn 3: Customer replies with 'Around ₹30,000 per person'
multi_turn_b2_turn3 = multi_turn_b2_turn2 + [
    {'role': 'assistant', 'content': r_b2_t2.get('message', '')},
    {'role': 'user', 'content': 'Around ₹30,000 per person'}
]
r_b2_t3 = post_chat(multi_turn_b2_turn3)
l_b2_t3 = r_b2_t3.get('extractedLead', {})
p_b2_t3 = r_b2_t3.get('suggestedPackages', [])
check("Bug 2 Turn 3 - stores updated budget (30000)", l_b2_t3.get('budgetPerPerson') == 30000, f"got {l_b2_t3.get('budgetPerPerson')}")
check("Bug 2 Turn 3 - produces updated packages", len(p_b2_t3) > 0)
for pkg in p_b2_t3:
    check(f"Bug 2 Turn 3 - package {pkg['name']} (₹{pkg['pricePerPerson']}) <= 30000", pkg['pricePerPerson'] <= 30000, f"price {pkg['pricePerPerson']}")

# 5. Variations of Bug 2 price objections
price_objections = [
    "That's too expensive.",
    "Can you do something cheaper?",
    "Those prices are above my budget.",
    "I need something more affordable."
]
for po in price_objections:
    conv = [
        {'role': 'user', 'content': 'Bali for 2 people around 50k'},
        {'role': 'assistant', 'content': 'Here is Bali package...'},
        {'role': 'user', 'content': po}
    ]
    r_po = post_chat(conv)
    p_po = r_po.get('suggestedPackages', [])
    m_po = r_po.get('message', '').lower()
    check(f"Price objection '{po}' - packages empty", len(p_po) == 0, f"got {len(p_po)}")
    check(f"Price objection '{po}' - asks comfortable budget", 'budget' in m_po)

print(f"\n==================================================")
print(f"TOTAL: {passed}/{total} tests passed.")
print("==================================================")
if passed == total:
    print("ALL REGRESSION TESTS PASSED PERFECTLY!")
    sys.exit(0)
else:
    sys.exit(1)
