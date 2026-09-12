# ai-agent-emplyee-travel-demo

> **Arjun Patel — Autonomous AI Travel Specialist**  
> Curated luxury & adventure travel consultant powered by a **27-Category (A through AA) Adversarial Perception Engine & Agent World Model**, deterministic catalog matching, and Razorpay booking token integration.

---

## 🌟 Key Features & Architectural Invariants

1. **27-Category Adversarial Perception Engine**:
   - Zero hardcoded phrases: typed entity extraction (`DestinationEntity`, `BudgetEntity`, `TravelersEntity`, `DurationEntity`).
   - Semantic normalization, typo resilience, and negation protection.
   - **Stereotype Neutrality (Cat T)**: *"best beer at a beach"*, *"casinos"*, *"snow"* keep destination `null` (never guesses Goa, Vegas, Kashmir, or Dubai).
   - **Ambiguity & Competing Referents (Cat U)**: When multiple options are surfaced (e.g. Bali and Kashmir) and the user says *"I like that one"*, Arjun flags ambiguity and asks for clarification (`CLARIFY_AMBIGUITY`).
   - **Contextual Ellipsis (Cat X)**: Slot-filling resolves isolated tokens (e.g. *"Four"* resolves to 4 days when asked duration, not 4 travelers).
   - **Hypothetical Language (Cat Z)**: *"If I had 50k..."* flagged `mode = 'HYPOTHETICAL'`, preventing mutation of active booking criteria.
   - **Info Query vs Target Booking (Cat AA)**: *"Is Goa expensive?"* or *"Does Kashmir have snow?"* triggers consultative answers (`intent = 'INFO_QUERY'`) without returning package recommendations.

2. **Perception Authority Boundary**:
   - Natural language is translated into structured entities and relations.
   - Business truths (catalog pricing, portfolio availability, booking token limits, cryptographic HMAC verification) remain deterministic backend-enforced.

3. **Strict Qualifying Package Invariant**:
   - `suggestedPackages` contains **ONLY** packages that satisfy all active hard constraints (destination, budget, travelers, duration, domestic restriction).
   - If zero packages qualify, `suggestedPackages = []`. Alternative packages are strictly segregated and never promoted into `suggestedPackages`.

4. **Qualification Gate (Bug 1 Protection)**:
   - Premature recommendations prevented on vague intents (*"I want a honeymoon trip."*). Missing criteria are systematically collected before recommendations occur.

5. **Generic Price Objection Handling (Bug 2 Protection)**:
   - Natural price objections (*"your price is too high"*, *"too expensive"*, *"need something cheaper"*) prevent repeated recommendations, reset budget, and inquire about comfortable price ceilings.

6. **Cryptographic HMAC-SHA256 Token Confirmation**:
   - ₹2,000 fixed token strictly enforced on server.
   - Razorpay webhook/client signature verification using secret HMAC keys prevents client-side price tampering.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- Python 3.9+ (for running automated test suites)

### Installation

```bash
git clone https://github.com/Sierra117marksman/ai-agent-emplyee-travel-demo.git
cd ai-agent-emplyee-travel-demo

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🌐 Deploy to Render (render.com)

This repository includes a [`render.yaml`](./render.yaml) blueprint for one-click or automated deployment on [Render](https://render.com).

### Option 1: Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) → **Blueprints** → **New Blueprint Instance**.
2. Connect this repository (`Sierra117marksman/ai-agent-emplyee-travel-demo`).
3. Render will automatically detect `render.yaml` and configure the service.
4. Fill in the required secret environment variables (e.g. `GROQ_API_KEY`, `RAZORPAY_KEY_SECRET`).
5. Click **Apply**.

### Option 2: Manual Web Service Setup
If creating a standard **Web Service** manually on Render:
- **Environment**: `Node`
- **Region**: Any (e.g., `Oregon (US West)` or `Singapore`)
- **Branch**: `main`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Plan**: `Free` or `Starter`

#### Environment Variables to Set on Render:
| Variable | Value / Description |
|---|---|
| `NODE_VERSION` | `20` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_SdTYv7Na6NpcrC` |
| `RAZORPAY_KEY_SECRET` | `CACsqCerPQIrB2jo5HvMjciA` |
| `BOOKING_TOKEN_AMOUNT_INR` | `2000` |
| `TRAVEL_SPECIALIST_PHONE` | `9999577734` |
| `GROQ_API_KEY` | *(Your Groq API key)* |
| `GEMINI_API_KEY` | *(Your Gemini API key)* |

---

## 🧪 Automated Test Verification

A complete suite of adversarial and regression tests is included in the `tests/` directory:

```bash
# 1. 27-Category (A through AA) Adversarial Test Suite (132/132 checks)
python tests/test_adversarial_suite.py

# 2. Bug Regression Suite (Qualification Gate & Price Objections - 35/35 checks)
python tests/test_regression_bugs.py

# 3. 10 End-to-End Customer Scenarios & Razorpay HMAC Locks (10/10 checks)
python tests/test_all_10_scenarios.py

# 4. Hard Constraints Evaluation (46/46 checks)
python tests/test_hard_constraints.py
```

### Type Checking & Linting

```bash
# Strict TypeScript Typecheck (0 errors)
npx tsc --noEmit

# ESLint Verification (0 errors, 0 warnings)
npm run lint

# Production Build
npm run build
```

---

## 📁 Project Architecture

```text
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Conversational agent endpoint
│   │   └── razorpay/              # Razorpay order creation & HMAC verification
│   ├── globals.css                # Tailwind CSS styling
│   ├── layout.tsx                 # Root layout & fonts
│   └── page.tsx                   # Interactive luxury concierge UI
├── components/
│   ├── ChatInterface.tsx          # Real-time message streaming & suggestions
│   ├── LeadDossier.tsx            # Live CRM memory & entity inspector
│   ├── PackageCard.tsx            # Travel package display & booking CTA
│   └── PaymentModal.tsx           # Razorpay checkout modal
└── lib/
    ├── agent/
    │   ├── engine.ts              # Master concierge synthesis & response engine
    │   ├── perception.ts          # 27-category adversarial perception layer
    │   ├── planner.ts             # Goal-driven action planner
    │   ├── tools.ts               # Autonomous tool executor
    │   └── types.ts               # Typed entity & world model definitions
    ├── packages.ts                # Deterministic catalog query & filter engine
    ├── razorpay.ts                # Server-side HMAC payment verification
    └── storage.ts                 # Persistent CRM lead dossier store
tests/
├── test_adversarial_suite.py      # Categories A through AA + Meta-Semantic Invariance
├── test_all_10_scenarios.py       # 10 production edge cases + HMAC verification
├── test_catalog_swap.py           # Dynamic inventory swap test
├── test_hard_constraints.py       # Hard constraint matrix verification
└── test_regression_bugs.py        # Bugs 1 & 2 regression protection
```

