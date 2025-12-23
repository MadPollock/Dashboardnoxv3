# API Contract: Company Profile

**Feature:** Company Profile  
**View Component:** `/src/app/views/CompanyProfileView.tsx`  
**Query Functions:** `/src/app/lib/queries.ts` (queryCompanyProfile, queryCompanyKYCStatus, queryCompanyReputationScore, queryCompanyFeeTier)  
**Feature Documentation:** `/docs/FEATURE_COMPANY_PROFILE.md`

---

## Overview

Company Profile is a **read-only informational page** that displays:
1. Company legal information (name, tax ID, UBO)
2. KYC verification status
3. Reputational Score (0-100) with animated gauge and benefits/penalties breakdown
4. Fee tier based on monthly volume
5. Final fee calculation (Base Fee × Reputation Multiplier)
6. Educational policy cards explaining reputation and fee systems

**Key Business Rules:**
- **Fee Formula:** `Final Fee = Base Fee (from tier) × Reputation Multiplier`
- **5 Reputation Levels:** Blocked (0-20, 0x multiplier), Low (20-40, 1.5x), Average (40-60, 1.2x), Good (60-80, 1.0x), Excellent (80-100, 0.8x)
- **5 Fee Tiers:** Up to R$ 500k (2.5%), R$ 500k-1M (2.0%), R$ 1M-2.5M (1.75%), R$ 2.5M-5M (1.5%), Above R$ 5M (1.25%)
- **Reputation Score:** Recalculated daily based on payment success rate (30%), chargeback rate (25%), dispute rate (20%), KYC compliance (15%), account age (10%)
- **Fee Tier:** Recalculated monthly based on previous month's total volume

**RBAC:** Admin, Operations, and Analyst roles can view (read-only). Developer role has NO access.

---

## Query Endpoints (4 total)

All endpoints are **GET** requests with **NO write actions**. Company Profile is 100% informational.

---

### 1. Get Company Profile

**Purpose:** Fetch basic company legal information and contact details.

**Frontend Query Function:** `queryCompanyProfile()`  
**TypeScript Interface:** `CompanyProfile`  
**Category:** **C** (Load once on page mount, data changes infrequently)

#### Request

```http
GET /api/company/profile
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Query Parameters:** None

**Request Body:** None

#### Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "id": "company_001",
  "companyName": "Comercio Digital LTDA",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@comerciodigital.com",
  "phone": "+55 11 98765-4321",
  "address": {
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Sala 501",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100",
    "country": "Brazil"
  },
  "kyc": {
    "status": "approved",
    "submittedAt": "2024-11-01T10:00:00Z",
    "approvedAt": "2024-11-15T14:30:00Z",
    "rejectedAt": null,
    "rejectionReason": null
  }
}
```

**TypeScript Interface:**
```typescript
export interface CompanyProfile {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  kyc: {
    status: 'not_started' | 'pending' | 'approved' | 'rejected';
    submittedAt?: string; // ISO 8601
    approvedAt?: string; // ISO 8601
    rejectedAt?: string; // ISO 8601
    rejectionReason?: string;
  };
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique company identifier |
| `companyName` | string | Yes | Legal business name (razão social) |
| `cnpj` | string | Yes | Brazilian company tax ID (CNPJ format: XX.XXX.XXX/XXXX-XX) |
| `email` | string | Yes | Company primary contact email |
| `phone` | string | Yes | Company primary contact phone (international format) |
| `address.street` | string | Yes | Street name |
| `address.number` | string | Yes | Street number |
| `address.complement` | string | No | Additional address info (suite, floor, etc.) |
| `address.city` | string | Yes | City name |
| `address.state` | string | Yes | State code (e.g., "SP", "RJ") |
| `address.zipCode` | string | Yes | Postal code (CEP) |
| `address.country` | string | Yes | Country name |
| `kyc.status` | enum | Yes | Current KYC status: `not_started`, `pending`, `approved`, `rejected` |
| `kyc.submittedAt` | string | No | ISO 8601 timestamp when KYC docs were submitted |
| `kyc.approvedAt` | string | No | ISO 8601 timestamp when KYC was approved |
| `kyc.rejectedAt` | string | No | ISO 8601 timestamp when KYC was rejected |
| `kyc.rejectionReason` | string | No | Human-readable reason for KYC rejection |

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired JWT token"
}
```

**403 Forbidden:**
```json
{
  "error": "forbidden",
  "message": "User does not have permission to view company profile"
}
```

**500 Internal Server Error:**
```json
{
  "error": "internal_server_error",
  "message": "Failed to retrieve company profile"
}
```

#### Business Rules

1. **Data Ownership:** User can only view their own company profile (enforced by JWT token).
2. **KYC Status Mapping:**
   - `not_started`: Company created but no KYC documents submitted → Show action required banner
   - `pending`: Documents submitted, awaiting Ops review → Show under review banner
   - `approved`: KYC verified → Show verified badge
   - `rejected`: KYC rejected (fraud, invalid docs) → Show error banner with reason
3. **CNPJ Format:** Always returned with mask: `XX.XXX.XXX/XXXX-XX`
4. **Phone Format:** Always returned in international format: `+XX XX XXXXX-XXXX`

---

### 2. Get KYC Status

**Purpose:** Fetch detailed KYC verification status including document submission history.

**Frontend Query Function:** `queryCompanyKYCStatus()`  
**TypeScript Interface:** `CompanyKYCStatus`  
**Category:** **C** (Load once on page mount, changes infrequently)

#### Request

```http
GET /api/company/kyc-status
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Query Parameters:** None

**Request Body:** None

#### Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "status": "verified",
  "ubo_name": "Maria Silva Santos",
  "verified_at": "2024-10-15T16:45:00Z",
  "verified_by": "ops_user_001",
  "verification_level": "full",
  "documents_submitted": {
    "cpf": {
      "status": "approved",
      "submitted_at": "2024-10-10T10:00:00Z",
      "approved_at": "2024-10-15T16:45:00Z"
    },
    "proof_of_address": {
      "status": "approved",
      "submitted_at": "2024-10-10T10:05:00Z",
      "approved_at": "2024-10-15T16:45:00Z"
    },
    "company_articles": {
      "status": "approved",
      "submitted_at": "2024-10-10T10:10:00Z",
      "approved_at": "2024-10-15T16:45:00Z"
    },
    "ubo_declaration": {
      "status": "approved",
      "submitted_at": "2024-10-10T10:15:00Z",
      "approved_at": "2024-10-15T16:45:00Z"
    }
  },
  "pending_requirements": [],
  "next_review_date": "2025-10-15T00:00:00Z",
  "notes": "All documents verified successfully"
}
```

**TypeScript Interface:**
```typescript
export interface KYCDocumentStatus {
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string; // ISO 8601
  approved_at?: string; // ISO 8601
  rejected_at?: string; // ISO 8601
  rejection_reason?: string;
}

export interface CompanyKYCStatus {
  status: 'verified' | 'pending' | 'not_started';
  ubo_name: string;
  verified_at?: string; // ISO 8601
  verified_by?: string; // Ops user ID
  verification_level?: 'basic' | 'full';
  documents_submitted?: {
    cpf?: KYCDocumentStatus;
    proof_of_address?: KYCDocumentStatus;
    company_articles?: KYCDocumentStatus;
    ubo_declaration?: KYCDocumentStatus;
  };
  pending_requirements: string[];
  next_review_date?: string; // ISO 8601
  notes?: string;
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum | Yes | Overall KYC status: `verified`, `pending`, `not_started` |
| `ubo_name` | string | Yes | Ultimate Beneficial Owner's full legal name |
| `verified_at` | string | No | ISO 8601 timestamp when KYC was fully verified |
| `verified_by` | string | No | ID of Ops user who approved KYC |
| `verification_level` | enum | No | Verification depth: `basic` (automated checks), `full` (manual review) |
| `documents_submitted.cpf` | object | No | CPF document status (selfie + ID photo) |
| `documents_submitted.proof_of_address` | object | No | Proof of address status (utility bill, bank statement) |
| `documents_submitted.company_articles` | object | No | Company articles status (contrato social) |
| `documents_submitted.ubo_declaration` | object | No | UBO declaration status (signed form) |
| `pending_requirements` | array | Yes | List of missing documents/actions (empty if verified) |
| `next_review_date` | string | No | ISO 8601 date when KYC renewal is required (annual review) |
| `notes` | string | No | Internal Ops notes about KYC verification |

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired JWT token"
}
```

**403 Forbidden:**
```json
{
  "error": "forbidden",
  "message": "User does not have permission to view KYC status"
}
```

**500 Internal Server Error:**
```json
{
  "error": "internal_server_error",
  "message": "Failed to retrieve KYC status"
}
```

#### Business Rules

1. **Status Flow:** `not_started` → `pending` (docs submitted) → `verified` (Ops approved)
2. **Blocked States:** 
   - `not_started`: Can process payments with limits (max R$ 10k/payment, R$ 50k/month)
   - `pending`: Same limits as not_started, waiting for Ops review (1-5 business days SLA)
   - `verified`: No limits, full access to all features
3. **Required Documents:** All 4 documents must be `approved` for status to be `verified`
4. **Annual Renewal:** KYC expires 1 year after `verified_at`, merchant must re-submit docs
5. **UBO Name:** Must match name on CPF document (enforced by Ops during verification)

---

### 3. Get Reputation Score

**Purpose:** Fetch current reputational score (0-100) with detailed factor breakdown and benefits/penalties.

**Frontend Query Function:** `queryCompanyReputationScore()`  
**TypeScript Interface:** `CompanyReputationScore`  
**Category:** **B** (Soft refresh 30s when page visible - score updates daily)

#### Request

```http
GET /api/company/reputation-score
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Query Parameters:** None

**Request Body:** None

#### Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "current_score": 75,
  "level": "good",
  "level_range": {
    "min": 60,
    "max": 80
  },
  "previous_score": 72,
  "score_change_30d": 3,
  "score_trend": "improving",
  "fee_multiplier": 1.0,
  "fee_adjustment_percent": 0,
  "benefits_applied": [
    "Standard settlement time (T+1)",
    "No transaction limits",
    "Standard support response time (24h)"
  ],
  "penalties_applied": [
    "None"
  ],
  "next_level": {
    "level": "excellent",
    "min_score": 80,
    "benefits": [
      "Reduced fees (-20%)",
      "Priority settlement (T+0)",
      "Priority support (4h response)"
    ],
    "score_gap": 5
  },
  "previous_level": {
    "level": "average",
    "max_score": 60,
    "penalties": [
      "Increased fees (+20%)",
      "Extended settlement (T+2)",
      "Potential transaction limits"
    ],
    "score_buffer": 15
  },
  "last_updated": "2025-12-22T00:00:00Z",
  "factors": {
    "payment_success_rate": {
      "value": 98.5,
      "weight": 0.3,
      "impact": "positive"
    },
    "chargeback_rate": {
      "value": 0.2,
      "weight": 0.25,
      "impact": "positive"
    },
    "dispute_rate": {
      "value": 0.5,
      "weight": 0.2,
      "impact": "neutral"
    },
    "kyc_compliance": {
      "value": "verified",
      "weight": 0.15,
      "impact": "positive"
    },
    "account_age_days": {
      "value": 347,
      "weight": 0.1,
      "impact": "positive"
    }
  }
}
```

**TypeScript Interface:**
```typescript
export type ReputationLevel = 'blocked' | 'low' | 'average' | 'good' | 'excellent';

export interface ReputationFactor {
  value: number | string;
  weight: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ReputationLevelInfo {
  level: ReputationLevel;
  min_score?: number;
  max_score?: number;
  benefits?: string[];
  penalties?: string[];
  score_gap?: number; // Points needed to reach next level
  score_buffer?: number; // Points above previous level
}

export interface CompanyReputationScore {
  current_score: number; // 0-100
  level: ReputationLevel;
  level_range: {
    min: number;
    max: number;
  };
  previous_score: number; // Score 30 days ago
  score_change_30d: number; // Delta (+/-)
  score_trend: 'improving' | 'stable' | 'declining';
  fee_multiplier: number; // 0, 0.8, 1.0, 1.2, 1.5
  fee_adjustment_percent: number; // -20, 0, +20, +50, -100 (blocked)
  benefits_applied: string[];
  penalties_applied: string[];
  next_level?: ReputationLevelInfo;
  previous_level?: ReputationLevelInfo;
  last_updated: string; // ISO 8601
  factors: {
    payment_success_rate: ReputationFactor;
    chargeback_rate: ReputationFactor;
    dispute_rate: ReputationFactor;
    kyc_compliance: ReputationFactor;
    account_age_days: ReputationFactor;
  };
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_score` | number | Yes | Current reputation score (0-100) |
| `level` | enum | Yes | Reputation level: `blocked`, `low`, `average`, `good`, `excellent` |
| `level_range.min` | number | Yes | Minimum score for current level |
| `level_range.max` | number | Yes | Maximum score for current level (exclusive) |
| `previous_score` | number | Yes | Score from 30 days ago (for trend comparison) |
| `score_change_30d` | number | Yes | Change in score over last 30 days (+3 = improving) |
| `score_trend` | enum | Yes | Overall trend: `improving`, `stable`, `declining` |
| `fee_multiplier` | number | Yes | Multiplier applied to base fee: 0 (blocked), 0.8 (excellent), 1.0 (good), 1.2 (average), 1.5 (low) |
| `fee_adjustment_percent` | number | Yes | Fee adjustment percentage: -20% (excellent), 0% (good), +20% (average), +50% (low), -100% (blocked) |
| `benefits_applied` | array | Yes | List of active benefits based on current level |
| `penalties_applied` | array | Yes | List of active penalties ("None" if good/excellent) |
| `next_level` | object | No | Info about next higher level (null if already excellent) |
| `previous_level` | object | No | Info about previous lower level (null if already blocked) |
| `last_updated` | string | Yes | ISO 8601 timestamp when score was last calculated |
| `factors.*` | object | Yes | Breakdown of 5 factors contributing to score |

#### Score Calculation Formula

**Total Score = Sum of all factor contributions:**

1. **Payment Success Rate (30% weight):**
   - Value: Percentage of payments that complete successfully (not expired, not failed)
   - Target: >95% = positive impact
   - Contribution: `(success_rate / 100) * 30`
   - Example: 98.5% → 29.55 points

2. **Chargeback Rate (25% weight):**
   - Value: Percentage of payments that result in chargeback
   - Target: <1% = positive, <0.5% = excellent
   - Contribution: `(1 - (chargeback_rate / 100)) * 25`
   - Example: 0.2% → 24.95 points

3. **Dispute Rate (20% weight):**
   - Value: Percentage of payments that result in dispute
   - Target: <2% = positive, <1% = excellent
   - Contribution: `(1 - (dispute_rate / 100)) * 20`
   - Example: 0.5% → 19.9 points

4. **KYC Compliance (15% weight):**
   - Value: KYC status (`verified` = 15, `pending` = 7.5, `not_started` = 0)
   - Contribution: 15 (verified), 7.5 (pending), 0 (not_started)
   - Example: `verified` → 15 points

5. **Account Age (10% weight):**
   - Value: Days since account creation
   - Target: >365 days = 10 points, <90 days = ~2 points
   - Contribution: `min(account_age_days / 365, 1) * 10`
   - Example: 347 days → 9.51 points

**Final Score:** Round to nearest integer (0-100)

#### Reputation Levels & Fee Multipliers

| Level | Score Range | Fee Multiplier | Fee Impact | Description |
|-------|-------------|----------------|------------|-------------|
| **Blocked** | 0-20 | 0x | -100% (cannot transact) | Severe fraud or compliance issues |
| **Low** | 20-40 | 1.5x | +50% penalty | High chargebacks, low success rate |
| **Average** | 40-60 | 1.2x | +20% penalty | Mediocre performance, room for improvement |
| **Good** | 60-80 | 1.0x | No change | Healthy performance, baseline |
| **Excellent** | 80-100 | 0.8x | -20% discount | Top-tier performance, rewarded with discount |

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired JWT token"
}
```

**403 Forbidden:**
```json
{
  "error": "forbidden",
  "message": "User does not have permission to view reputation score"
}
```

**500 Internal Server Error:**
```json
{
  "error": "internal_server_error",
  "message": "Failed to retrieve reputation score"
}
```

#### Business Rules

1. **Daily Recalculation:** Score recalculated daily at 00:00 UTC using data from last 30 days
2. **Blocking Threshold:** Score <20 = transactions disabled (merchant cannot process payments)
3. **KYC Requirement:** Without KYC verified, max score is capped at 60 (cannot reach excellent)
4. **New Accounts:** Start with low score (~20-40) due to low account age, improves over time
5. **Sudden Drops:** Drop >20 points in 7 days triggers automatic alert email to merchant
6. **Factor Impact:** Each factor shows `positive`, `neutral`, or `negative` impact to help merchants understand what to improve

---

### 4. Get Fee Tier

**Purpose:** Fetch current fee tier based on monthly volume, with tier ladder and final fee calculation.

**Frontend Query Function:** `queryCompanyFeeTier()`  
**TypeScript Interface:** `CompanyFeeTier`  
**Category:** **B** (Soft refresh 30s when page visible - tier updates monthly)

#### Request

```http
GET /api/company/fee-tier
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Query Parameters:** None

**Request Body:** None

#### Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "current_tier": {
    "tier_id": "tier_2",
    "tier_name": "R$ 1M - R$ 2.5M",
    "min_volume": 1000000,
    "max_volume": 2500000,
    "base_fee_percent": 1.75
  },
  "last_month_volume": 1800000,
  "last_month_currency": "BRL",
  "current_base_fee": 1.75,
  "reputation_multiplier": 1.0,
  "final_fee_percent": 1.75,
  "fee_adjustment_percent": 0,
  "next_tier": {
    "tier_id": "tier_3",
    "tier_name": "R$ 2.5M - R$ 5M",
    "min_volume": 2500000,
    "max_volume": 5000000,
    "base_fee_percent": 1.5,
    "volume_needed": 700000
  },
  "previous_tier": {
    "tier_id": "tier_1",
    "tier_name": "R$ 500k - R$ 1M",
    "max_volume": 1000000,
    "base_fee_percent": 2.0
  },
  "all_tiers": [
    {
      "tier_id": "tier_0",
      "tier_name": "Up to R$ 500k",
      "max_volume": 500000,
      "base_fee_percent": 2.5
    },
    {
      "tier_id": "tier_1",
      "tier_name": "R$ 500k - R$ 1M",
      "min_volume": 500000,
      "max_volume": 1000000,
      "base_fee_percent": 2.0
    },
    {
      "tier_id": "tier_2",
      "tier_name": "R$ 1M - R$ 2.5M",
      "min_volume": 1000000,
      "max_volume": 2500000,
      "base_fee_percent": 1.75
    },
    {
      "tier_id": "tier_3",
      "tier_name": "R$ 2.5M - R$ 5M",
      "min_volume": 2500000,
      "max_volume": 5000000,
      "base_fee_percent": 1.5
    },
    {
      "tier_id": "tier_4",
      "tier_name": "Above R$ 5M",
      "min_volume": 5000000,
      "base_fee_percent": 1.25
    }
  ],
  "last_updated": "2025-12-01T00:00:00Z",
  "calculation_period": "2024-11-01 to 2024-11-30"
}
```

**TypeScript Interface:**
```typescript
export interface FeeTierInfo {
  tier_id: string;
  tier_name: string;
  min_volume?: number; // Null for tier_0 (no minimum)
  max_volume?: number; // Null for tier_4 (no maximum)
  base_fee_percent: number;
  volume_needed?: number; // Only present in next_tier (amount to reach it)
}

export interface CompanyFeeTier {
  current_tier: FeeTierInfo;
  last_month_volume: number; // In currency below
  last_month_currency: string; // "BRL", "USD", etc.
  current_base_fee: number; // Same as current_tier.base_fee_percent
  reputation_multiplier: number; // From reputation score API
  final_fee_percent: number; // current_base_fee × reputation_multiplier
  fee_adjustment_percent: number; // (reputation_multiplier - 1) × 100
  next_tier?: FeeTierInfo; // Null if already at tier_4
  previous_tier?: FeeTierInfo; // Null if at tier_0
  all_tiers: FeeTierInfo[];
  last_updated: string; // ISO 8601
  calculation_period: string; // Human-readable period
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_tier.tier_id` | string | Yes | Unique tier identifier (`tier_0` to `tier_4`) |
| `current_tier.tier_name` | string | Yes | Human-readable tier name |
| `current_tier.min_volume` | number | No | Minimum monthly volume for this tier (BRL) |
| `current_tier.max_volume` | number | No | Maximum monthly volume for this tier (BRL) |
| `current_tier.base_fee_percent` | number | Yes | Base fee percentage (before reputation adjustment) |
| `last_month_volume` | number | Yes | Total processed volume in previous month |
| `last_month_currency` | string | Yes | Currency of volume (always "BRL" for now) |
| `current_base_fee` | number | Yes | Current base fee (same as `current_tier.base_fee_percent`) |
| `reputation_multiplier` | number | Yes | Multiplier from reputation score (0, 0.8, 1.0, 1.2, 1.5) |
| `final_fee_percent` | number | Yes | Final fee charged: `current_base_fee × reputation_multiplier` |
| `fee_adjustment_percent` | number | Yes | Adjustment percentage: `(reputation_multiplier - 1) × 100` |
| `next_tier` | object | No | Info about next higher tier (null if at tier_4) |
| `next_tier.volume_needed` | number | No | Additional volume needed to reach next tier |
| `previous_tier` | object | No | Info about previous lower tier (null if at tier_0) |
| `all_tiers` | array | Yes | Complete list of all 5 tiers (for UI ladder) |
| `last_updated` | string | Yes | ISO 8601 timestamp when tier was last calculated |
| `calculation_period` | string | Yes | Human-readable date range used for volume calculation |

#### Fee Tier Breakdown

| Tier | Volume Range (Monthly) | Base Fee | Target Merchant |
|------|------------------------|----------|-----------------|
| **tier_0** | Up to R$ 500k | 2.5% | Small merchants, startups |
| **tier_1** | R$ 500k - R$ 1M | 2.0% | Growing merchants |
| **tier_2** | R$ 1M - R$ 2.5M | 1.75% | Mid-size merchants |
| **tier_3** | R$ 2.5M - R$ 5M | 1.5% | Large merchants |
| **tier_4** | Above R$ 5M | 1.25% | Enterprise merchants |

#### Final Fee Calculation Examples

**Example 1: Good reputation, mid-tier volume**
- Volume: R$ 1.8M → Tier 2 (1.75% base)
- Reputation: 75 (Good) → 1.0x multiplier
- Final Fee: 1.75% × 1.0 = **1.75%**

**Example 2: Excellent reputation, high volume**
- Volume: R$ 6M → Tier 4 (1.25% base)
- Reputation: 92 (Excellent) → 0.8x multiplier
- Final Fee: 1.25% × 0.8 = **1.0%** (best possible rate!)

**Example 3: Low reputation, low volume (worst case)**
- Volume: R$ 300k → Tier 0 (2.5% base)
- Reputation: 35 (Low) → 1.5x multiplier
- Final Fee: 2.5% × 1.5 = **3.75%** (very high!)

**Example 4: Blocked (cannot transact)**
- Volume: Any
- Reputation: 15 (Blocked) → 0x multiplier
- Final Fee: Base × 0 = **Transactions disabled**

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired JWT token"
}
```

**403 Forbidden:**
```json
{
  "error": "forbidden",
  "message": "User does not have permission to view fee tier"
}
```

**500 Internal Server Error:**
```json
{
  "error": "internal_server_error",
  "message": "Failed to retrieve fee tier"
}
```

#### Business Rules

1. **Monthly Recalculation:** Tier recalculated on 1st day of each month based on previous month's volume
2. **Volume Calculation:** Sum of ALL completed payments in previous calendar month (regardless of currency)
3. **Currency Conversion:** If payment in USD/USDC, convert to BRL at payment date's exchange rate
4. **First Month:** New merchants start at tier_0 (2.5%) until first full month completes
5. **Tier Lock:** Tier is locked for entire month (doesn't change mid-month even if volume increases)
6. **Enterprise Custom Pricing:** Merchants processing >R$ 10M/month can negotiate custom rates (bypass tier system)
7. **Gaming Detection:** Ops monitors for suspicious patterns (e.g., 50 tiny payments on last day of month to reach next tier)

---

## Command Endpoints (0 total)

**Company Profile is 100% read-only.** Merchants cannot directly modify:
- Company information → Only via Crossramp Ops/Support
- Reputation score → Automatically calculated by system
- Fee tier → Automatically determined by volume
- KYC status → Only via external KYC flow + Ops approval

**Future potential write actions (not yet implemented):**
1. **Update Company Information** - Merchant submits changes (requires Ops approval)
2. **Request KYC Re-verification** - Trigger new KYC flow if company details changed
3. **Request Reputation Review** - Merchant disputes low score (submit appeal)
4. **Request Fee Tier Review** - Enterprise merchants negotiate custom pricing

---

## Frontend Integration

### Query Hook Usage

```typescript
import { useQuery } from '../hooks/useQuery';
import {
  queryCompanyProfile,
  queryCompanyKYCStatus,
  queryCompanyReputationScore,
  queryCompanyFeeTier,
} from '../lib/queries';

// Inside component:

// Category C: Load once (no polling)
const { data: profileData, loading: isLoadingProfile, error: profileError } = useQuery(
  () => queryCompanyProfile(),
  [],
  {} // No refetchInterval
);

const { data: kycData, loading: isLoadingKYC, error: kycError } = useQuery(
  () => queryCompanyKYCStatus(),
  [],
  {}
);

// Category B: Soft refresh 30s
const { data: reputationData, loading: isLoadingReputation, error: reputationError } = useQuery(
  () => queryCompanyReputationScore(),
  [],
  { refetchInterval: 30000 }
);

const { data: feeTierData, loading: isLoadingFeeTier, error: feeTierError } = useQuery(
  () => queryCompanyFeeTier(),
  [],
  { refetchInterval: 30000 }
);
```

### Error Handling

```typescript
useEffect(() => {
  if (profileError) {
    toast.error('Failed to load company profile');
  }
  if (kycError) {
    toast.error('Failed to load KYC status');
  }
  if (reputationError) {
    toast.error('Failed to load reputation score');
  }
  if (feeTierError) {
    toast.error('Failed to load fee tier');
  }
}, [profileError, kycError, reputationError, feeTierError]);
```

### Loading States

Show loading spinner while any of the 4 queries are loading:

```typescript
const isLoading = isLoadingProfile || isLoadingKYC || isLoadingReputation || isLoadingFeeTier;

if (isLoading) {
  return <LoadingSpinner />;
}
```

### RBAC Enforcement

```typescript
import { useAuth } from '../contexts/AuthContext';

const { hasRole } = useAuth();
const canView = hasRole('admin'); // TODO: Add 'operations', 'analyst'

if (!canView) {
  return <AccessDenied />;
}
```

---

## Implementation Checklist

### Backend (Bastion Adapters)

- [ ] **GET /api/company/profile**
  - [ ] Fetch company record from database
  - [ ] Return CompanyProfile format
  - [ ] Enforce JWT auth + company ownership

- [ ] **GET /api/company/kyc-status**
  - [ ] Fetch KYC status from verification system
  - [ ] Return CompanyKYCStatus format
  - [ ] Include document submission history

- [ ] **GET /api/company/reputation-score**
  - [ ] Calculate score from 5 factors (payment_success_rate, chargeback_rate, dispute_rate, kyc_compliance, account_age_days)
  - [ ] Determine level and fee_multiplier
  - [ ] Return CompanyReputationScore format
  - [ ] Cache result for 24 hours (recalculate daily at 00:00 UTC)

- [ ] **GET /api/company/fee-tier**
  - [ ] Fetch last month volume from payments database
  - [ ] Determine tier based on volume
  - [ ] Fetch reputation_multiplier from reputation API
  - [ ] Calculate final_fee_percent
  - [ ] Return CompanyFeeTier format
  - [ ] Cache result for 24 hours (recalculate monthly on 1st day)

### Frontend (Already Implemented ✅)

- [x] TypeScript interfaces in `/src/app/lib/queries.ts`
- [x] Query functions with mock data generators
- [x] `CompanyProfileView` component with useQuery hooks
- [x] KYC status banner (verified/pending/not_started)
- [x] Animated reputation gauge (0-100)
- [x] Fee tier ladder with visual highlighting
- [x] Fee breakdown tooltip
- [x] Reputation tooltips (upgrade/downgrade preview)
- [x] Policy cards (reputation + fee level)
- [x] RBAC enforcement (admin-only)
- [x] Error handling with toast notifications
- [x] Loading states
- [x] Comprehensive translations (EN/PT/ES)

---

## Testing Checklist

### Unit Tests (Backend)

- [ ] Reputation score calculation with various factor combinations
- [ ] Fee tier determination for edge cases (exactly at threshold)
- [ ] Currency conversion (USD → BRL)
- [ ] KYC status transitions
- [ ] Score blocking logic (score <20)

### Integration Tests (Backend)

- [ ] GET /api/company/profile returns correct data
- [ ] GET /api/company/kyc-status reflects document changes
- [ ] GET /api/company/reputation-score updates after payment
- [ ] GET /api/company/fee-tier updates on 1st of month

### E2E Tests (Frontend)

- [ ] Page loads all 4 queries successfully
- [ ] KYC banner shows correct status (verified/pending/not_started)
- [ ] Reputation gauge animates to correct score
- [ ] Fee tier highlights current tier
- [ ] Fee breakdown tooltip shows correct calculation
- [ ] Access denied for non-admin users
- [ ] Error toasts appear when queries fail

---

## Notes for Backend Team

### Reputation Score Calculation

**Pseudocode:**
```python
def calculate_reputation_score(merchant_id):
    # Fetch data from last 30 days
    payments = get_payments(merchant_id, last_30_days=True)
    
    # Factor 1: Payment Success Rate (30%)
    total_payments = len(payments)
    successful = len([p for p in payments if p.status == 'completed'])
    success_rate = (successful / total_payments) * 100
    factor1 = (success_rate / 100) * 30
    
    # Factor 2: Chargeback Rate (25%)
    chargebacks = len([p for p in payments if p.has_chargeback])
    chargeback_rate = (chargebacks / total_payments) * 100
    factor2 = (1 - (chargeback_rate / 100)) * 25
    
    # Factor 3: Dispute Rate (20%)
    disputes = len([p for p in payments if p.has_dispute])
    dispute_rate = (disputes / total_payments) * 100
    factor3 = (1 - (dispute_rate / 100)) * 20
    
    # Factor 4: KYC Compliance (15%)
    kyc_status = get_kyc_status(merchant_id)
    if kyc_status == 'verified':
        factor4 = 15
    elif kyc_status == 'pending':
        factor4 = 7.5
    else:  # not_started
        factor4 = 0
    
    # Factor 5: Account Age (10%)
    account_age_days = (today - merchant.created_at).days
    factor5 = min(account_age_days / 365, 1) * 10
    
    # Total score
    score = round(factor1 + factor2 + factor3 + factor4 + factor5)
    
    # Determine level and fee_multiplier
    if score >= 80:
        level = 'excellent'
        fee_multiplier = 0.8
    elif score >= 60:
        level = 'good'
        fee_multiplier = 1.0
    elif score >= 40:
        level = 'average'
        fee_multiplier = 1.2
    elif score >= 20:
        level = 'low'
        fee_multiplier = 1.5
    else:  # score < 20
        level = 'blocked'
        fee_multiplier = 0  # Cannot transact
    
    return {
        'current_score': score,
        'level': level,
        'fee_multiplier': fee_multiplier,
        ...
    }
```

### Fee Tier Determination

**Pseudocode:**
```python
def calculate_fee_tier(merchant_id):
    # Fetch last month volume (previous calendar month)
    last_month_start = first_day_of_previous_month()
    last_month_end = last_day_of_previous_month()
    
    payments = get_completed_payments(
        merchant_id,
        from_date=last_month_start,
        to_date=last_month_end
    )
    
    # Sum volume (convert non-BRL to BRL at payment date rate)
    total_volume = 0
    for payment in payments:
        if payment.currency == 'BRL':
            total_volume += payment.amount
        else:
            rate = get_fx_rate(payment.currency, 'BRL', payment.created_at)
            total_volume += payment.amount * rate
    
    # Determine tier
    if total_volume <= 500000:
        tier = tier_0  # 2.5%
    elif total_volume <= 1000000:
        tier = tier_1  # 2.0%
    elif total_volume <= 2500000:
        tier = tier_2  # 1.75%
    elif total_volume <= 5000000:
        tier = tier_3  # 1.5%
    else:
        tier = tier_4  # 1.25%
    
    # Fetch reputation multiplier
    reputation = get_reputation_score(merchant_id)
    
    # Calculate final fee
    final_fee = tier.base_fee_percent * reputation.fee_multiplier
    
    return {
        'current_tier': tier,
        'last_month_volume': total_volume,
        'reputation_multiplier': reputation.fee_multiplier,
        'final_fee_percent': final_fee,
        ...
    }
```

### Caching Strategy

**Reputation Score:**
- Calculate daily at 00:00 UTC
- Cache for 24 hours
- Invalidate cache if merchant manually requests recalculation (future feature)

**Fee Tier:**
- Calculate monthly on 1st day at 00:00 UTC
- Cache for 30 days
- Never changes mid-month (locked)

**Company Profile & KYC Status:**
- No caching (rarely changes, cheap query)
- If performance issue, cache for 1 hour with manual invalidation on update

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-23 | 1.0 | Initial API contract for Company Profile feature. Defined 4 GET endpoints (profile, KYC, reputation, fee tier) with comprehensive schemas, business rules, and calculation formulas. |
