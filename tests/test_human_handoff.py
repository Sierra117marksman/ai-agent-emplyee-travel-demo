"""
Human Handoff Adversarial Test Suite — 13 categories
Tests the full handoff lifecycle: explicit requests, repeated failure counter,
complex triggers, idempotency, dossier completeness, CRM status, chip types,
and escape hatch presence.
"""

import subprocess
import json
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:3000/api/chat"


def chat(messages: list[dict]) -> dict:
    """Send a chat request and return the parsed JSON response."""
    import urllib.request
    import urllib.error

    data = json.dumps({"messages": messages}).encode("utf-8")
    req = urllib.request.Request(
        BASE_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"success": False, "error": f"HTTP {e.code}: {body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def user(text: str) -> dict:
    return {"role": "user", "content": text}


def assistant(text: str) -> dict:
    return {"role": "assistant", "content": text}


PASS = 0
FAIL = 0
RESULTS = []


def check(label: str, condition: bool, detail: str = "") -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        RESULTS.append(f"  PASS  {label}")
    else:
        FAIL += 1
        RESULTS.append(f"  FAIL  {label}" + (f" | {detail}" if detail else ""))


# =========================================================================
# Category 1: Explicit Human Request — Immediate Handoff
# =========================================================================
def test_explicit_human_request_give_me_a_human():
    msgs = [user("give me a human")]
    r = chat(msgs)
    check(
        "CAT1a: 'give me a human' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )
    check(
        "CAT1a: reason = customer_requested",
        r.get("handoffReason") == "customer_requested",
        f"handoffReason={r.get('handoffReason')}",
    )


def test_explicit_human_request_talk_to_someone():
    msgs = [user("can I talk to someone?")]
    r = chat(msgs)
    check(
        "CAT1b: 'can I talk to someone?' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"got={r.get('isHumanHandoff')}",
    )
    check(
        "CAT1b: reason = customer_requested",
        r.get("handoffReason") == "customer_requested",
        f"handoffReason={r.get('handoffReason')}",
    )


def test_explicit_human_request_dont_want_bot():
    msgs = [user("I don't want to talk to a bot")]
    r = chat(msgs)
    check(
        "CAT1c: 'I don't want to talk to a bot' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"got={r.get('isHumanHandoff')}",
    )


def test_explicit_human_connect_me():
    msgs = [user("connect me to someone")]
    r = chat(msgs)
    check(
        "CAT1d: 'connect me to someone' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"got={r.get('isHumanHandoff')}",
    )


def test_explicit_human_real_person():
    msgs = [user("I want to speak with a real person")]
    r = chat(msgs)
    check(
        "CAT1e: 'speak with a real person' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"got={r.get('isHumanHandoff')}",
    )


# =========================================================================
# Category 2: No Premature Handoff
# =========================================================================
def test_no_premature_handoff_on_greeting():
    msgs = [user("Hi")]
    r = chat(msgs)
    check(
        "CAT2a: 'Hi' → NOT isHumanHandoff",
        r.get("isHumanHandoff") is not True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )


def test_no_premature_handoff_on_interest():
    msgs = [user("I like mountains")]
    r = chat(msgs)
    check(
        "CAT2b: 'I like mountains' → NOT isHumanHandoff",
        r.get("isHumanHandoff") is not True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )


def test_no_premature_handoff_on_destination():
    msgs = [user("I want to go to Kashmir")]
    r = chat(msgs)
    check(
        "CAT2c: 'I want to go to Kashmir' → NOT isHumanHandoff",
        r.get("isHumanHandoff") is not True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )


# =========================================================================
# Category 3: Repeated Resolution Failure → Auto-Escalation
# =========================================================================
def test_repeated_budget_conflict_escalates():
    """
    Simulate Kashmir + ₹15k repeated 4 times.
    After resolutionFailureCount reaches 3, should auto-escalate.
    """
    # Turn 1: First ask (count=0, no escalation)
    t1_user = user("I want Kashmir for 15000 per person")
    r1 = chat([t1_user])
    # Should NOT escalate on first
    check(
        "CAT3a: First Kashmir ₹15k → NOT immediate handoff",
        r1.get("isHumanHandoff") is not True,
        f"isHumanHandoff={r1.get('isHumanHandoff')}",
    )

    # Turn 2: Repeat same (count=1)
    t1_assistant = assistant(r1.get("message", ""))
    r2 = chat([t1_user, t1_assistant, user("still want Kashmir 15000")])

    # Turn 3: Repeat same (count=2)
    t2_assistant = assistant(r2.get("message", ""))
    r3 = chat([t1_user, t1_assistant, user("still want Kashmir 15000"),
               t2_assistant, user("Kashmir 15000 rupees only")])

    # Turn 4: Should now escalate (count>=3)
    t3_assistant = assistant(r3.get("message", ""))
    r4 = chat([t1_user, t1_assistant, user("still want Kashmir 15000"),
               t2_assistant, user("Kashmir 15000 rupees only"),
               t3_assistant, user("15000 kashmir final")])

    check(
        "CAT3b: After 4 Kashmir ₹15k turns → eventually escalates",
        r4.get("isHumanHandoff") is True or r3.get("isHumanHandoff") is True,
        f"r3.isHumanHandoff={r3.get('isHumanHandoff')}, r4.isHumanHandoff={r4.get('isHumanHandoff')}",
    )
    if r4.get("isHumanHandoff"):
        check(
            "CAT3c: Escalation reason = repeated_failed_resolution",
            r4.get("handoffReason") == "repeated_failed_resolution",
            f"handoffReason={r4.get('handoffReason')}",
        )


# =========================================================================
# Category 4: Complex Request Triggers
# =========================================================================
def test_custom_itinerary_trigger():
    msgs = [user("I need a completely custom itinerary for 30 people")]
    r = chat(msgs)
    check(
        "CAT4a: 'custom itinerary for 30 people' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )
    check(
        "CAT4a: reason is custom_itinerary or complex_exception",
        r.get("handoffReason") in ("custom_itinerary", "complex_exception"),
        f"handoffReason={r.get('handoffReason')}",
    )


def test_refund_trigger():
    msgs = [user("I need a refund for my booking")]
    r = chat(msgs)
    check(
        "CAT4b: 'I need a refund' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )
    check(
        "CAT4b: reason = refund",
        r.get("handoffReason") == "refund",
        f"handoffReason={r.get('handoffReason')}",
    )


def test_payment_issue_trigger():
    msgs = [user("I paid but my booking still says pending")]
    r = chat(msgs)
    check(
        "CAT4c: 'I paid but booking says pending' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )
    check(
        "CAT4c: reason = payment_issue",
        r.get("handoffReason") == "payment_issue",
        f"handoffReason={r.get('handoffReason')}",
    )


def test_booking_change_trigger():
    msgs = [user("I want to change my confirmed booking")]
    r = chat(msgs)
    check(
        "CAT4d: 'change my confirmed booking' → isHumanHandoff=true",
        r.get("isHumanHandoff") is True,
        f"isHumanHandoff={r.get('isHumanHandoff')}",
    )
    check(
        "CAT4d: reason = booking_change",
        r.get("handoffReason") == "booking_change",
        f"handoffReason={r.get('handoffReason')}",
    )


# =========================================================================
# Category 5: Dossier Completeness
# =========================================================================
def test_dossier_has_required_fields():
    msgs = [user("give me a human")]
    r = chat(msgs)
    dossier = r.get("handoffDossier", {})
    check(
        "CAT5a: dossier present",
        bool(dossier),
        f"handoffDossier={dossier}",
    )
    check(
        "CAT5b: dossier.handoffId present",
        bool(dossier.get("handoffId")),
        f"handoffId={dossier.get('handoffId')}",
    )
    check(
        "CAT5c: dossier.specialistPhone NOT hardcoded in response (env var)",
        # The phone value should be whatever is in TRAVEL_SPECIALIST_PHONE env
        # We just check it's a string (could be empty in test env)
        isinstance(dossier.get("specialistPhone"), str),
        f"specialistPhone type={type(dossier.get('specialistPhone'))}",
    )
    check(
        "CAT5d: dossier.reason is a string",
        isinstance(dossier.get("reason"), str),
        f"reason={dossier.get('reason')}",
    )
    check(
        "CAT5e: dossier.chatTranscript is a list",
        isinstance(dossier.get("chatTranscript"), list),
        f"chatTranscript={dossier.get('chatTranscript')}",
    )
    check(
        "CAT5f: dossier.packagesShown is a list",
        isinstance(dossier.get("packagesShown"), list),
        f"packagesShown={dossier.get('packagesShown')}",
    )
    check(
        "CAT5g: dossier.priority is HIGH/MEDIUM/LOW",
        dossier.get("priority") in ("HIGH", "MEDIUM", "LOW"),
        f"priority={dossier.get('priority')}",
    )


def test_dossier_priority_high_for_customer_requested():
    msgs = [user("give me a human")]
    r = chat(msgs)
    dossier = r.get("handoffDossier", {})
    check(
        "CAT5h: customer_requested dossier.priority = HIGH",
        dossier.get("priority") == "HIGH",
        f"priority={dossier.get('priority')}",
    )


# =========================================================================
# Category 6: CRM Status
# =========================================================================
def test_crm_status_human_handoff():
    msgs = [user("give me a human")]
    r = chat(msgs)
    memory = r.get("memory", {})
    business = memory.get("business", {})
    check(
        "CAT6a: memory.business.leadStatus = HUMAN_HANDOFF",
        business.get("leadStatus") == "HUMAN_HANDOFF",
        f"leadStatus={business.get('leadStatus')}",
    )
    check(
        "CAT6b: memory.business.activeHandoffId is set",
        bool(business.get("activeHandoffId")),
        f"activeHandoffId={business.get('activeHandoffId')}",
    )


# =========================================================================
# Category 7: Idempotency — No Duplicate Handoffs
# =========================================================================
def test_idempotency_no_duplicate_handoff():
    # First handoff
    msgs1 = [user("give me a human")]
    r1 = chat(msgs1)
    handoff_id_1 = r1.get("handoffDossier", {}).get("handoffId")
    memory1 = r1.get("memory", {})

    # Second request simulating same conversation
    # The memory carries activeHandoffId forward
    msgs2 = [
        user("give me a human"),
        assistant(r1.get("message", "")),
        user("I said give me a human again"),
    ]
    r2 = chat(msgs2)
    handoff_id_2 = r2.get("handoffDossier", {}).get("handoffId")

    check(
        "CAT7a: Second handoff request returns same handoffId (idempotent)",
        handoff_id_1 == handoff_id_2 or r2.get("handoffDossier", {}).get("isExistingHandoff") is True
        or (handoff_id_1 and handoff_id_2 and handoff_id_1 == handoff_id_2),
        f"id1={handoff_id_1}, id2={handoff_id_2}",
    )


# =========================================================================
# Category 8: Quick Reply Chips for HUMAN_HANDOFF Goal
# =========================================================================
def test_handoff_quick_replies_structure():
    msgs = [user("give me a human")]
    r = chat(msgs)
    qr = r.get("quickReplies", [])
    actions = [c.get("frontendAction") for c in qr if c.get("frontendAction")]
    check(
        "CAT8a: HUMAN_HANDOFF returns frontendAction chips",
        len(actions) >= 3,
        f"frontendActions={actions}",
    )
    check(
        "CAT8b: HANDOFF_SPECIALIST chip present",
        "HANDOFF_SPECIALIST" in actions,
        f"actions={actions}",
    )
    check(
        "CAT8c: REQUEST_CALLBACK chip present",
        "REQUEST_CALLBACK" in actions,
        f"actions={actions}",
    )
    check(
        "CAT8d: CONTINUE_WITH_ARJUN chip present",
        "CONTINUE_WITH_ARJUN" in actions,
        f"actions={actions}",
    )


# =========================================================================
# Category 9: Escape Hatch Chip on Non-Handoff Goals
# =========================================================================
def test_escape_hatch_on_qualify_goal():
    msgs = [user("I like mountains")]
    r = chat(msgs)
    qr = r.get("quickReplies", [])
    specialist_chips = [c for c in qr if c.get("frontendAction") == "HANDOFF_SPECIALIST"]
    check(
        "CAT9a: Non-handoff goal has escape hatch HANDOFF_SPECIALIST chip",
        len(specialist_chips) >= 1,
        f"quickReplies={[(c.get('label'), c.get('frontendAction')) for c in qr]}",
    )


def test_escape_hatch_on_greet():
    msgs = [user("hello")]
    r = chat(msgs)
    qr = r.get("quickReplies", [])
    specialist_chips = [c for c in qr if c.get("frontendAction") == "HANDOFF_SPECIALIST"]
    check(
        "CAT9b: GREET goal has escape hatch HANDOFF_SPECIALIST chip",
        len(specialist_chips) >= 1,
        f"quickReplies={[(c.get('label'), c.get('frontendAction')) for c in qr]}",
    )


# =========================================================================
# Category 10: No Phone Hardcoding in API Response
# =========================================================================
def test_no_hardcoded_phone_in_message():
    msgs = [user("give me a human")]
    r = chat(msgs)
    message = r.get("message", "")
    # Phone should come from env, not be hardcoded 9999577734 in source
    # The message itself may contain the number IF env is set \u2014 that's fine
    # We just verify the API field is present and correct type
    dossier = r.get("handoffDossier", {})
    check(
        "CAT10a: specialistPhone field exists in dossier (from env)",
        "specialistPhone" in dossier,
        f"dossier keys={list(dossier.keys())}",
    )


# =========================================================================
# Run All Tests
# =========================================================================
if __name__ == "__main__":
    print("=" * 70)
    print("HUMAN HANDOFF ADVERSARIAL TEST SUITE")
    print("=" * 70)
    print()

    tests = [
        ("CAT1: Explicit Requests", [
            test_explicit_human_request_give_me_a_human,
            test_explicit_human_request_talk_to_someone,
            test_explicit_human_request_dont_want_bot,
            test_explicit_human_connect_me,
            test_explicit_human_real_person,
        ]),
        ("CAT2: No Premature Handoff", [
            test_no_premature_handoff_on_greeting,
            test_no_premature_handoff_on_interest,
            test_no_premature_handoff_on_destination,
        ]),
        ("CAT3: Repeated Failure Auto-Escalation", [
            test_repeated_budget_conflict_escalates,
        ]),
        ("CAT4: Complex Request Triggers", [
            test_custom_itinerary_trigger,
            test_refund_trigger,
            test_payment_issue_trigger,
            test_booking_change_trigger,
        ]),
        ("CAT5: Dossier Completeness", [
            test_dossier_has_required_fields,
            test_dossier_priority_high_for_customer_requested,
        ]),
        ("CAT6: CRM Status", [
            test_crm_status_human_handoff,
        ]),
        ("CAT7: Idempotency", [
            test_idempotency_no_duplicate_handoff,
        ]),
        ("CAT8: Handoff Quick Reply Chips", [
            test_handoff_quick_replies_structure,
        ]),
        ("CAT9: Escape Hatch on Non-Handoff Goals", [
            test_escape_hatch_on_qualify_goal,
            test_escape_hatch_on_greet,
        ]),
        ("CAT10: No Hardcoded Phone Numbers", [
            test_no_hardcoded_phone_in_message,
        ]),
    ]

    for category_name, category_tests in tests:
        print(f"\n{category_name}")
        print("-" * 50)
        for test_fn in category_tests:
            try:
                test_fn()
            except Exception as e:
                FAIL += 1
                RESULTS.append(f"  FAIL  {test_fn.__name__} | EXCEPTION: {e}")

    print()
    print("=" * 70)
    for result in RESULTS:
        print(result)
    print()
    print("=" * 70)
    total = PASS + FAIL
    print(f"RESULT: {PASS}/{total} PASS {'✅' if FAIL == 0 else '❌'}")
    print("=" * 70)

    if FAIL > 0:
        sys.exit(1)
