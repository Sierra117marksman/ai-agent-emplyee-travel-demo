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
print("TEST SUITE: HARD CONSTRAINTS & STATE DECONTAMINATION")
print("==================================================")

# ----------------------------------------------------
# TEST CASE A: "hello"
# ----------------------------------------------------
print("\n--- CASE A: 'hello' ---")
r_a = post_chat([{'role': 'user', 'content': 'hello'}])
lead_a = r_a.get('extractedLead', {})
pkgs_a = r_a.get('suggestedPackages', [])
msg_a = r_a.get('message', '')

check("Case A - tripStyle is None", lead_a.get('tripStyle') is None, f"got {lead_a.get('tripStyle')}")
check("Case A - destination is None", lead_a.get('destination') is None, f"got {lead_a.get('destination')}")
check("Case A - budget is None", lead_a.get('budgetPerPerson') is None, f"got {lead_a.get('budgetPerPerson')}")
check("Case A - packages is empty []", len(pkgs_a) == 0, f"got {len(pkgs_a)}")
check("Case A - NO 'milestone' in message", 'milestone' not in msg_a.lower(), f"msg: {msg_a}")
check("Case A - warm welcoming greeting", 'welcome' in msg_a.lower() or 'namaste' in msg_a.lower(), f"msg: {msg_a}")

# ----------------------------------------------------
# TEST CASE B: "I want to see mountains"
# ----------------------------------------------------
print("\n--- CASE B: 'I want to see mountains' ---")
r_b = post_chat([{'role': 'user', 'content': 'I want to see mountains'}])
lead_b = r_b.get('extractedLead', {})
pkgs_b = r_b.get('suggestedPackages', [])
msg_b = r_b.get('message', '')

check("Case B - interests contains 'mountains'", 'mountains' in lead_b.get('interests', []), f"got {lead_b.get('interests')}")
check("Case B - tripStyle is None (NOT honeymoon)", lead_b.get('tripStyle') is None, f"got {lead_b.get('tripStyle')}")
check("Case B - destination is None", lead_b.get('destination') is None, f"got {lead_b.get('destination')}")
check("Case B - budget is None", lead_b.get('budgetPerPerson') is None, f"got {lead_b.get('budgetPerPerson')}")
check("Case B - packages is empty []", len(pkgs_b) == 0, f"got {len(pkgs_b)}")
check("Case B - NO 'milestone' in message", 'milestone' not in msg_b.lower(), f"msg: {msg_b}")
check("Case B - asks for missing qualification details", 'destination' in msg_b.lower() or 'budget' in msg_b.lower(), f"msg: {msg_b}")

# ----------------------------------------------------
# TEST CASE C: "Kashmir, 15000 per person, 2 people"
# ----------------------------------------------------
print("\n--- CASE C: 'Kashmir, 15000 per person, 2 people' ---")
r_c = post_chat([{'role': 'user', 'content': 'Kashmir 15000 per person and 2 person'}])
lead_c = r_c.get('extractedLead', {})
pkgs_c = r_c.get('suggestedPackages', [])
msg_c = r_c.get('message', '')

check("Case C - destination is Kashmir", lead_c.get('destination') == 'Kashmir', f"got {lead_c.get('destination')}")
check("Case C - budget is 15000", lead_c.get('budgetPerPerson') == 15000, f"got {lead_c.get('budgetPerPerson')}")
check("Case C - travelers is 2", lead_c.get('travelers') == 2, f"got {lead_c.get('travelers')}")
check("Case C - suggestedPackages is strictly empty [] (38500 > 15000)", len(pkgs_c) == 0, f"got {[p['name'] for p in pkgs_c]}")
check("Case C - Thailand is NOT suggested", all('thailand' not in p['name'].lower() and 'phuket' not in p['name'].lower() for p in pkgs_c))
check("Case C - Arjun explains Kashmir starts at 38,500 or exceeds budget", '38,500' in msg_c or '38500' in msg_c or 'exceeds' in msg_c.lower() or 'portfolio' in msg_c.lower(), f"msg: {msg_c}")

# ----------------------------------------------------
# TEST CASE D: "Kashmir, ₹40,000 per person, 2 people for 5 days"
# ----------------------------------------------------
print("\n--- CASE D: 'Kashmir, ₹40,000 per person, 2 people for 5 days' ---")
r_d = post_chat([{'role': 'user', 'content': 'Kashmir, ₹40,000 per person, 2 people for 5 days'}])
lead_d = r_d.get('extractedLead', {})
pkgs_d = r_d.get('suggestedPackages', [])

check("Case D - destination is Kashmir", lead_d.get('destination') == 'Kashmir')
check("Case D - budget is 40000", lead_d.get('budgetPerPerson') == 40000)
check("Case D - Kashmir package qualifies (38,500 <= 40,000)", any('kashmir' in p['destination'].lower() for p in pkgs_d), f"got {[p['name'] for p in pkgs_d]}")
check("Case D - Thailand/Phuket does NOT qualify", all('phuket' not in p['destination'].lower() and 'thailand' not in p['name'].lower() for p in pkgs_d))

# ----------------------------------------------------
# TEST CASE E: "Kashmir, 15000 per person, I'm open to other destinations"
# ----------------------------------------------------
print("\n--- CASE E: 'Kashmir, 15000 per person, I\'m open to other destinations' ---")
r_e = post_chat([{'role': 'user', 'content': "Kashmir, 15000 per person, I'm open to other destinations"}])
lead_e = r_e.get('extractedLead', {})
pkgs_e = r_e.get('suggestedPackages', [])
msg_e = r_e.get('message', '')

check("Case E - destinationFlexibility is 'yes'", lead_e.get('destinationFlexibility') == 'yes', f"got {lead_e.get('destinationFlexibility')}")
check("Case E - budget is 15000", lead_e.get('budgetPerPerson') == 15000)
check("Case E - suggestedPackages is empty [] (no catalog package <= 15000)", len(pkgs_e) == 0, f"got {[p['name'] for p in pkgs_e]}")
check("Case E - explains starting portfolio rates", '29,999' in msg_e or '29999' in msg_e or '38,500' in msg_e or 'portfolio' in msg_e.lower(), f"msg: {msg_e}")

# ----------------------------------------------------
# TEST CASE F: "I don't care where, I just want mountains under ₹15k"
# ----------------------------------------------------
print("\n--- CASE F: 'I don\'t care where, I just want mountains under ₹15k' ---")
r_f = post_chat([{'role': 'user', 'content': "I don't care where, I just want mountains under ₹15k"}])
lead_f = r_f.get('extractedLead', {})
pkgs_f = r_f.get('suggestedPackages', [])
msg_f = r_f.get('message', '')

check("Case F - destinationFlexibility is 'yes'", lead_f.get('destinationFlexibility') == 'yes', f"got {lead_f.get('destinationFlexibility')}")
check("Case F - interests contains 'mountains'", 'mountains' in lead_f.get('interests', []))
check("Case F - budget is 15000", lead_f.get('budgetPerPerson') == 15000)
check("Case F - suggestedPackages is empty [] (no mountain package <= 15k)", len(pkgs_f) == 0, f"got {[p['name'] for p in pkgs_f]}")
check("Case F - explains starting rates honestly", '29,999' in msg_f or '29999' in msg_f or 'starting' in msg_f.lower() or 'curated' in msg_f.lower(), f"msg: {msg_f}")

# ----------------------------------------------------
# TEST MULTI-TURN SEQUENCE
# ----------------------------------------------------
print("\n--- MULTI-TURN STATE TRANSITION SEQUENCE ---")
seq = [
    # Turn 1
    {'role': 'user', 'content': 'hello'},
]
r1 = post_chat(seq)
check("Seq Turn 1 - tripStyle is None", r1.get('extractedLead', {}).get('tripStyle') is None)

seq.append({'role': 'assistant', 'content': r1.get('message', '')})
seq.append({'role': 'user', 'content': 'I want to see mountains'})
r2 = post_chat(seq)
lead2 = r2.get('extractedLead', {})
check("Seq Turn 2 - interests has mountains", 'mountains' in lead2.get('interests', []))
check("Seq Turn 2 - tripStyle is None (no honeymoon leak)", lead2.get('tripStyle') is None)
check("Seq Turn 2 - suggestedPackages empty", len(r2.get('suggestedPackages', [])) == 0)

seq.append({'role': 'assistant', 'content': r2.get('message', '')})
seq.append({'role': 'user', 'content': 'Kashmir 15000 per person and 2 person'})
r3 = post_chat(seq)
lead3 = r3.get('extractedLead', {})
pkgs3 = r3.get('suggestedPackages', [])
check("Seq Turn 3 - destination is Kashmir", lead3.get('destination') == 'Kashmir')
check("Seq Turn 3 - budget is 15000", lead3.get('budgetPerPerson') == 15000)
check("Seq Turn 3 - travelers is 2", lead3.get('travelers') == 2)
check("Seq Turn 3 - suggestedPackages empty [] (zero 15k Kashmir packages)", len(pkgs3) == 0, f"got {[p['name'] for p in pkgs3]}")

seq.append({'role': 'assistant', 'content': r3.get('message', '')})
seq.append({'role': 'user', 'content': 'my budget is 15000'})
r4 = post_chat(seq)
lead4 = r4.get('extractedLead', {})
pkgs4 = r4.get('suggestedPackages', [])
check("Seq Turn 4 - destination preserved as Kashmir", lead4.get('destination') == 'Kashmir')
check("Seq Turn 4 - budget preserved as 15000", lead4.get('budgetPerPerson') == 15000)
check("Seq Turn 4 - suggestedPackages remains empty []", len(pkgs4) == 0)

seq.append({'role': 'assistant', 'content': r4.get('message', '')})
seq.append({'role': 'user', 'content': "I'm open to other destinations"})
r5 = post_chat(seq)
lead5 = r5.get('extractedLead', {})
pkgs5 = r5.get('suggestedPackages', [])
check("Seq Turn 5 - destinationFlexibility is 'yes'", lead5.get('destinationFlexibility') == 'yes')
check("Seq Turn 5 - budget is 15000", lead5.get('budgetPerPerson') == 15000)
check("Seq Turn 5 - suggestedPackages empty [] (nothing <= 15000)", len(pkgs5) == 0)

print("\n==================================================")
print(f"TOTAL: {passed}/{total} tests passed.")
print("==================================================")
if passed == total:
    print("ALL HARD CONSTRAINTS & STATE TRANSITIONS PASSED 100%!")
    sys.exit(0)
else:
    sys.exit(1)
