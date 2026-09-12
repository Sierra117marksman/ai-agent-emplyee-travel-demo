"""
Semantic Relationship Authority & Evidence-Based Compatibility Test Suite
Tests:
1. beaches -> Kashmir: Must NOT claim Kashmir satisfies beaches, must NOT parrot other destinations
2. snow -> Dubai: Must NOT claim Dubai is for snow
3. mountains -> Maldives: Must NOT claim Maldives has mountains
4. mountains -> Kashmir: Evidence-based connection MUST connect verified mountains to Kashmir
"""

import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3000/api/chat'

def chat(msgs):
    payload = json.dumps({'messages': msgs}).encode('utf-8')
    req = urllib.request.Request(BASE_URL, data=payload, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))

def run_tests():
    print("==================================================")
    print("SEMANTIC RELATIONSHIP AUTHORITY TEST SUITE")
    print("==================================================\n")

    # TEST 1: beaches -> Kashmir
    print("--- TEST 1: beaches -> Kashmir (No cross-contamination) ---")
    r1 = chat([
        {'role': 'user', 'content': 'beaches'},
        {'role': 'assistant', 'content': 'Experiencing beaches is a wonderful way to travel...'},
        {'role': 'user', 'content': 'Kashmir'}
    ])
    msg1 = r1.get('message', '')
    print(f"Response: {msg1}\n")
    assert 'beaches' not in msg1.lower() or 'not' in msg1.lower(), "FAILED: Claimed beaches for Kashmir!"
    assert 'bali' not in msg1.lower(), "FAILED: Parroted Bali when destination is already Kashmir!"

    # TEST 2: snow -> Dubai
    print("--- TEST 2: snow -> Dubai (No cross-contamination) ---")
    r2 = chat([
        {'role': 'user', 'content': 'snow'},
        {'role': 'assistant', 'content': 'Snow is wonderful...'},
        {'role': 'user', 'content': 'Dubai'}
    ])
    msg2 = r2.get('message', '')
    print(f"Response: {msg2}\n")
    assert 'experiencing snow' not in msg2.lower(), "FAILED: Claimed snow for Dubai!"
    assert 'kashmir' not in msg2.lower(), "FAILED: Parroted portfolio destinations when destination is Dubai!"

    # TEST 3: mountains -> Maldives
    print("--- TEST 3: mountains -> Maldives (No cross-contamination) ---")
    r3 = chat([
        {'role': 'user', 'content': 'mountains'},
        {'role': 'assistant', 'content': 'Mountains are wonderful...'},
        {'role': 'user', 'content': 'Maldives'}
    ])
    msg3 = r3.get('message', '')
    print(f"Response: {msg3}\n")
    assert 'experiencing mountains' not in msg3.lower(), "FAILED: Claimed mountains for Maldives!"
    assert 'kashmir' not in msg3.lower(), "FAILED: Parroted portfolio destinations when destination is Maldives!"

    # TEST 4: mountains -> Kashmir (Evidence-based connection)
    print("--- TEST 4: mountains -> Kashmir (Evidence-based connection) ---")
    r4 = chat([
        {'role': 'user', 'content': 'mountains'},
        {'role': 'assistant', 'content': 'Mountains are wonderful...'},
        {'role': 'user', 'content': 'Kashmir'}
    ])
    msg4 = r4.get('message', '')
    print(f"Response: {msg4}\n")
    assert 'mountains' in msg4.lower(), "FAILED: Should connect verified mountains to Kashmir!"

    print("==================================================")
    print("ALL 4 SEMANTIC RELATIONSHIP TESTS PASSED 100%!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
