import json
import urllib.request
import urllib.error
import hmac
import hashlib
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"

def post_json(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_tests():
    print("==================================================")
    print("STARTING 10 SCENARIO TEST SUITE FOR ARJUN PATEL")
    print("==================================================\n")

    # TEST 1: Honeymoon in Bali
    print("--- TEST 1: 'I want a honeymoon in Bali for 2 people.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I want a honeymoon in Bali for 2 people."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    assert "Bali" in str(res.get('message')) or "Bali" in str(suggested), "Test 1 Failed: Bali not found"

    # TEST 2: Family trip within 35k budget for 5 days
    print("--- TEST 2: 'I have ₹35k per person and want a 5-day family trip.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I have ₹35k per person and want a 5-day family trip."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    # Budget is 35k, should match packages around 35k like Kerala or Kashmir, not 80k Maldives
    for p in res.get('suggestedPackages', []):
        assert p['pricePerPerson'] <= 45000, f"Test 2 Failed: Package {p['name']} exceeds budget significantly"

    # TEST 3: Adventure in India
    print("--- TEST 3: 'We\\'re looking for an adventure trip somewhere in India.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "We're looking for an adventure trip somewhere in India."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    for p in res.get('suggestedPackages', []):
        assert p['isDomesticIndia'] is True, f"Test 3 Failed: Non-domestic package suggested: {p['name']}"

    # TEST 4: Dubai 6 days
    print("--- TEST 4: 'I want to visit Dubai for 6 days.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I want to visit Dubai for 6 days."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    assert "Dubai" in str(res.get('message')) or "Dubai" in str(suggested), "Test 4 Failed: Dubai not found"

    # TEST 5: No destination, budget 50k
    print("--- TEST 5: 'I don\\'t know where I want to go. Budget is ₹50k per person.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I don't know where I want to go. Budget is ₹50k per person."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    for p in res.get('suggestedPackages', []):
        assert p['pricePerPerson'] <= 55000, f"Test 5 Failed: Package {p['name']} exceeds 50k budget limit"

    # TEST 6: Forget Bali. Show me something else.
    print("--- TEST 6: 'Forget Bali. Show me something else.' (After Bali discussion) ---")
    status, res = post_json("/api/chat", {
        "messages": [
            {"role": "user", "content": "I want a romantic trip to Bali."},
            {"role": "assistant", "content": "Bali Romantic Villa Escape is a wonderful choice at ₹44,999/person."},
            {"role": "user", "content": "Forget Bali. Show me something else."}
        ]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    for p in res.get('suggestedPackages', []):
        assert "bali" not in p['id'].lower(), f"Test 6 Failed: Bali was not excluded: {p['id']}"

    # TEST 7: Can I book the second option?
    print("--- TEST 7: 'Can I book the second option?' ---")
    status, res = post_json("/api/chat", {
        "messages": [
            {"role": "user", "content": "Show me romantic getaways under 50k."},
            {"role": "assistant", "content": "1. Bali Romantic Villa (₹44,999)\n2. Kashmir Alpine Paradise (₹38,500)"},
            {"role": "user", "content": "Can I book the second option?"}
        ]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    msg = res.get('message', '').lower()
    assert "2,000" in msg or "token" in msg or "book" in msg, "Test 7 Failed: Booking prompt not present"

    # TEST 8: Custom token attempt (I want to pay ₹500 instead of ₹2,000)
    print("--- TEST 8: 'I want to pay ₹500 instead of ₹2,000.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I want to pay ₹500 instead of ₹2,000."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    msg = res.get('message', '')
    assert "fixed at ₹2000" in msg or "fixed at ₹2,000" in msg or "cannot accept custom token" in msg, "Test 8 Failed: Custom token amount was not strictly rejected"

    # TEST 9: Unverified payment claim (I already paid)
    print("--- TEST 9: 'I already paid.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "I already paid."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    msg = res.get('message', '').lower()
    assert "cannot independently confirm" in msg or "verification" in msg or "gateway" in msg, "Test 9 Failed: Unverified payment claim was not guarded"

    # TEST 10: Uncataloged destination (Mars)
    print("--- TEST 10: 'Give me a package for Mars.' ---")
    status, res = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "Give me a package for Mars."}]
    })
    print(f"Status: {status}")
    print(f"Message: {res.get('message')}")
    suggested = [p['name'] for p in res.get('suggestedPackages', [])]
    print(f"Suggested Packages: {suggested}")
    print(f"Extracted Lead: {res.get('extractedLead')}\n")
    msg = res.get('message', '').lower()
    assert "do not currently offer" in msg or "not in our" in msg or "mars" in msg, "Test 10 Failed: Uncataloged destination Mars was not handled gracefully"
    assert len(suggested) == 0, "Test 10 Failed: Should not suggest packages for Mars"

    # RAZORPAY INTEGRATION TESTS
    print("==================================================")
    print("TESTING RAZORPAY INTEGRATION & STRICT BACKEND LOCKS")
    print("==================================================")

    # 1. Order Creation with client tamper attempt (client sends amount 500)
    print("\n--- TEST: Create Order (Server Enforces ₹2,000) ---")
    status, order_res = post_json("/api/razorpay/create-order", {
        "packageId": "kashmir-heaven-valleys",
        "customerName": "Autonomous Test Lead",
        "customerPhone": "+91 98765 00000",
        "amount": 500 # Tamper attempt! Server MUST ignore this and lock to 2000
    })
    print(f"Create Order Status: {status}")
    print(f"Order Response: {json.dumps(order_res, indent=2)}")
    assert order_res.get('success') is True, "Create Order Failed"
    assert order_res.get('amount') == 2000, f"Server failed to lock amount to 2000! Got: {order_res.get('amount')}"
    order_id = order_res.get('orderId')
    lead_id = order_res.get('leadId')

    # 2. Fake Signature Verification Attempt (Fraud rejection)
    print("\n--- TEST: Tampered Signature Verification ---")
    status, fake_ver = post_json("/api/razorpay/verify-payment", {
        "leadId": lead_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_fake_12345",
        "razorpay_signature": "0000000000000000000000000000000000000000000000000000000000000000"
    })
    print(f"Tamper Verification Status: {status}")
    print(f"Tamper Verification Response: {json.dumps(fake_ver, indent=2)}")
    assert fake_ver.get('success') is False or fake_ver.get('status') == 'PAYMENT_FAILED', "Fraud verification failed to reject fake signature!"

    # 3. Cryptographically Valid Signature Verification
    print("\n--- TEST: Authentic HMAC-SHA256 Signature Verification ---")
    secret = "CACsqCerPQIrB2jo5HvMjciA" # Test secret from .env.local
    test_payment_id = "pay_AutomatedTestVerified_888"
    msg_to_sign = f"{order_id}|{test_payment_id}".encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), msg_to_sign, hashlib.sha256).hexdigest()

    status, auth_ver = post_json("/api/razorpay/verify-payment", {
        "leadId": lead_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": test_payment_id,
        "razorpay_signature": valid_sig
    })
    print(f"Authentic Verification Status: {status}")
    print(f"Authentic Verification Response: {json.dumps(auth_ver, indent=2)}")
    assert auth_ver.get('success') is True, "Authentic verification failed"
    assert auth_ver.get('status') == 'BOOKING_CONFIRMED', "Status was not BOOKING_CONFIRMED"

    print("\n==================================================")
    print("ALL 10 SCENARIOS & RAZORPAY INTEGRATION PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
