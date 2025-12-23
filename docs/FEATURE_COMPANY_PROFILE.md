# Feature Documentation: Company Profile

**Componente de View:** `/src/app/views/CompanyProfileView.tsx`  
**ID de Rota/Navegação:** `company-profile` (under Settings section)  
**API Contract:** `/docs/API_CONTRACT_COMPANY_PROFILE.md` (⚠️ **Canonical source of truth for all endpoints**)

## ✅ Implementation Status

**COMPLETE** - All queries integrated, MFA flows implemented, RBAC enforced, translations complete.

### Completed Items
- [x] TypeScript interfaces in `/src/app/lib/queries.ts`
  - [x] `CompanyProfile` interface (company info + KYC)
  - [x] `CompanyKYCStatus` interface (KYC verification details)
  - [x] `CompanyReputationScore` interface (score + factors + benefits/penalties)
  - [x] `CompanyFeeTier` interface (tier + volume + final fee calculation)
- [x] Query functions with mock data
  - [x] `queryCompanyProfile()` - Category C
  - [x] `queryCompanyKYCStatus()` - Category C
  - [x] `queryCompanyReputationScore()` - Category B (30s polling)
  - [x] `queryCompanyFeeTier()` - Category B (30s polling)
- [x] View component with useQuery hooks integration
- [x] RBAC enforcement (admin-only, TODO: add operations/analyst)
- [x] Loading states and error handling with toast notifications
- [x] KYC status banner (verified/pending/not_started)
- [x] Animated reputation gauge (0-100 circular progress)
- [x] Fee tier ladder visualization
- [x] Fee breakdown tooltip (base + adjustment = final)
- [x] Reputation tooltips (upgrade/downgrade preview)
- [x] Policy information cards
- [x] Comprehensive translations (EN/PT/ES)
- [x] API contract documentation created

## História de usuário

**Como** administrador ou operador do merchant,  
**Eu quero** visualizar informações da minha empresa (legal name, tax ID, UBO), meu reputational score atual (0-100) com breakdown de benefits/penalties, meu fee tier baseado em volume mensal, e entender como esses fatores combinam para calcular minha taxa final,  
**Para que** eu possa entender exatamente quanto estou pagando de fees, por que estou nesse nível, o que preciso fazer para melhorar meu score (unlock discounts), e qual volume preciso atingir para subir de fee tier (reduzir taxas base).

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) tem acesso **read-only** (visualizar tudo)
  - Operations (`user_operations_crossramp`) tem acesso **read-only** (visualizar tudo)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (visualizar tudo)
  - Developer NÃO tem acesso (página não aparece na navegação)
- **Read-only page:** Nenhuma ação de escrita (merchant não pode editar company info, score, ou fees)
- **Page structure (6 main sections):**
  1. **KYC Status Banner** - Topo da página, destaque
     - **Verified:** Info banner (blue/green) com ShieldCheck icon, badge "Verified", mostra UBO + date
     - **Pending:** Alert banner (yellow/orange) com AlertTriangle icon, badge "Under Review", CTA "Complete KYC"
     - **Not Started:** Alert banner (red) com AlertTriangle icon, badge "Action Required", CTA "Complete KYC"
  2. **Company Information Card** - Legal details + current fee
     - Legal Name, Tax ID (CNPJ), UBO
     - Current Fee com breakdown tooltip (base fee + reputation adjustment = final fee)
  3. **Reputational Score Card** - Animated circular gauge
     - 5 levels: Blocked (0-20), Low (20-40), Average (40-60), Good (60-80), Excellent (80-100)
     - Color-coded segments (gray, yellow shades, orange, primary orange)
     - Center shows score number + level label
     - Benefits/Penalties for current level
     - Tooltips: ChevronDown (downgrade preview), ChevronUp (upgrade preview)
     - CTAs: "Learn More" (external), "View Statement" (navigate to Reputation Statement page)
  4. **Fee Level Card** - Volume-based tier ladder
     - Last month volume (R$ X.XXX.XXX)
     - Current fee tier (highlighted)
     - 5 tiers: Up to 500k (2.5%), 500k-1M (2.0%), 1M-2.5M (1.75%), 2.5M-5M (1.5%), Above 5M (1.25%)
     - Visual ladder: passed tiers (light orange), current (bright orange), future (gray)
  5. **Reputation Policy Card** - Info card explaining reputation system
     - Benefits (3 bullet points)
     - Penalties (3 bullet points)
  6. **Fee Level Policy Card** - Info card explaining volume tiers
     - Benefits (3 bullet points)
     - How It Works (3 bullet points)
- **Fee calculation formula:**
  - **Base Fee:** Determined by monthly volume tier (2.5% down to 1.25%)
  - **Reputation Multiplier:** 
    - Blocked: 0x (cannot transact)
    - Low: 1.5x (+50% penalty)
    - Average: 1.2x (+20% penalty)
    - Good: 1.0x (no change)
    - Excellent: 0.8x (-20% discount)
  - **Final Fee = Base Fee × Reputation Multiplier**
  - Example: Volume tier = 2.0%, Reputation = Good → Final = 2.0% × 1.0 = 2.0%
  - Example: Volume tier = 2.0%, Reputation = Low → Final = 2.0% × 1.5 = 3.0% (penalty!)
  - Example: Volume tier = 2.0%, Reputation = Excellent → Final = 2.0% × 0.8 = 1.6% (discount!)
- **Animated score:** Circular gauge animates from 0 to current score on page mount (1.5s animation, 60 steps)
- **Tooltips:**
  - Fee breakdown tooltip: Hover over fee (shows base + adjustment + final)
  - Downgrade preview: Hover ChevronDown (shows benefits/penalties of lower level)
  - Upgrade preview: Hover ChevronUp (shows benefits/penalties of higher level)
- **Responsive:** Cards stack on mobile, grid 2 columns on desktop
- **Color system:**
  - Reputation levels use gradient from gray → yellow → orange → primary orange
  - Green for discounts (Excellent level), red for penalties (Low/Average levels)
  - Primary orange for current fee tier

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter perfil da empresa** | `GET` | `/api/company/profile` | `{}` | `{ "legal_name": "Comercio Digital LTDA", "tax_id": "12.345.678/0001-90", "ubo_name": "Maria Silva Santos", "ubo_cpf": "123.456.789-01", "ubo_email": "maria@comerciodigital.com", "address": { "street": "Av. Paulista", "number": "1000", "complement": "Sala 501", "district": "Bela Vista", "city": "São Paulo", "state": "SP", "postal_code": "01310-100", "country": "Brazil" }, "phone": "+55 11 98765-4321", "email": "contato@comerciodigital.com", "website": "https://comerciodigital.com.br", "industry": "E-commerce", "company_size": "small", "founded_date": "2020-03-15", "created_at": "2024-01-10T10:00:00Z", "updated_at": "2024-12-20T14:30:00Z" }` | **C** (Categoria C - Load once on page mount, rarely changes) | Toast "Failed to load company profile" + Empty state com Retry |
| **Obter status KYC** | `GET` | `/api/company/kyc-status` | `{}` | `{ "status": "verified", "ubo_name": "Maria Silva Santos", "verified_at": "2024-10-15T16:45:00Z", "verified_by": "ops_user_001", "verification_level": "full", "documents_submitted": { "cpf": { "status": "approved", "submitted_at": "2024-10-10T10:00:00Z", "approved_at": "2024-10-15T16:45:00Z" }, "proof_of_address": { "status": "approved", "submitted_at": "2024-10-10T10:05:00Z", "approved_at": "2024-10-15T16:45:00Z" }, "company_articles": { "status": "approved", "submitted_at": "2024-10-10T10:10:00Z", "approved_at": "2024-10-15T16:45:00Z" }, "ubo_declaration": { "status": "approved", "submitted_at": "2024-10-10T10:15:00Z", "approved_at": "2024-10-15T16:45:00Z" } }, "pending_requirements": [], "next_review_date": "2025-10-15T00:00:00Z", "notes": "All documents verified successfully" }` | **C** (Categoria C - Changes infrequently, load once) | Se `pending` ou `not_started`, mostra banner de ação. Se erro, assume not_started e mostra banner. |
| **Obter reputational score** | `GET` | `/api/company/reputation-score` | `{}` | `{ "current_score": 75, "level": "good", "level_range": { "min": 60, "max": 80 }, "previous_score": 72, "score_change_30d": 3, "score_trend": "improving", "fee_multiplier": 1.0, "fee_adjustment_percent": 0, "benefits_applied": ["Standard settlement time (T+1)", "No transaction limits", "Standard support response time (24h)"], "penalties_applied": ["None"], "next_level": { "level": "excellent", "min_score": 80, "benefits": ["Reduced fees (-20%)", "Priority settlement (T+0)", "Priority support (4h response)"], "score_gap": 5 }, "previous_level": { "level": "average", "max_score": 60, "penalties": ["Increased fees (+20%)", "Extended settlement (T+2)", "Potential transaction limits"], "score_buffer": 15 }, "last_updated": "2025-12-22T00:00:00Z", "factors": { "payment_success_rate": { "value": 98.5, "weight": 0.3, "impact": "positive" }, "chargeback_rate": { "value": 0.2, "weight": 0.25, "impact": "positive" }, "dispute_rate": { "value": 0.5, "weight": 0.2, "impact": "neutral" }, "kyc_compliance": { "value": "verified", "weight": 0.15, "impact": "positive" }, "account_age_days": { "value": 347, "weight": 0.1, "impact": "positive" } } }` | **B** (Categoria B - Changes daily, soft refresh 30s when page visible) | Se falhar, mostra score = 0, level = "blocked" (worst case scenario, merchant contacted) |
| **Obter fee tier atual** | `GET` | `/api/company/fee-tier` | `{}` | `{ "current_tier": { "tier_id": "tier_2", "tier_name": "R$ 500k - R$ 1M", "min_volume": 500000, "max_volume": 1000000, "base_fee_percent": 2.0 }, "last_month_volume": 1800000, "last_month_currency": "BRL", "current_base_fee": 2.0, "reputation_multiplier": 1.0, "final_fee_percent": 2.0, "fee_adjustment_percent": 0, "next_tier": { "tier_id": "tier_3", "tier_name": "R$ 1M - R$ 2.5M", "min_volume": 1000000, "max_volume": 2500000, "base_fee_percent": 1.75, "volume_needed": 0 }, "previous_tier": { "tier_id": "tier_1", "tier_name": "Up to R$ 500k", "max_volume": 500000, "base_fee_percent": 2.5 }, "all_tiers": [{ "tier_id": "tier_0", "tier_name": "Up to R$ 500k", "max_volume": 500000, "base_fee_percent": 2.5 }, { "tier_id": "tier_1", "tier_name": "R$ 500k - R$ 1M", "min_volume": 500000, "max_volume": 1000000, "base_fee_percent": 2.0 }, { "tier_id": "tier_2", "tier_name": "R$ 1M - R$ 2.5M", "min_volume": 1000000, "max_volume": 2500000, "base_fee_percent": 1.75 }, { "tier_id": "tier_3", "tier_name": "R$ 2.5M - R$ 5M", "min_volume": 2500000, "max_volume": 5000000, "base_fee_percent": 1.5 }, { "tier_id": "tier_4", "tier_name": "Above R$ 5M", "min_volume": 5000000, "base_fee_percent": 1.25 }], "last_updated": "2025-12-22T00:00:00Z", "calculation_period": "2024-11-01 to 2024-11-30" }` | **B** (Categoria B - Recalculated monthly, soft refresh 30s) | Se falhar, mostra tier_0 (highest fee), merchant sees worst case |

**Notas sobre classificação de queries:**

- **Company profile (Categoria C):** Dados cadastrais mudam RARAMENTE (apenas quando merchant atualiza via suporte ou Ops corrige). Load once on page mount.
  
- **KYC status (Categoria C):** Status KYC muda poucas vezes na vida do merchant (not_started → pending → verified). Load once on page mount. Se mudar, Ops notifica merchant por email separadamente.

- **Reputation score (Categoria B):** Score é recalculado DIARIAMENTE baseado em payment success rate, chargebacks, disputes, KYC compliance, account age. Soft refresh 30s para mostrar mudanças recentes.

- **Fee tier (Categoria B):** Fee tier é recalculado MENSALMENTE baseado em volume do mês anterior. Soft refresh 30s (mesmo que só mude 1x/mês, boa prática manter atualizado).

**Importante:** Company Profile é principalmente informacional/educational. Merchant vem aqui para:
1. Entender "por que estou pagando X% de fee?"
2. Descobrir "o que preciso fazer para pagar menos?"
3. Ver "onde estou na escada de reputação/volume?"

Não precisa de polling agressivo (Categoria A), mas deve estar razoavelmente atualizado (Categoria B para scores/fees).

---

## Ações de escrita (commands)

**Nenhuma ação de escrita direta.** Company Profile é uma página 100% read-only (informational).

**Nota:** Merchant NÃO pode:
- Editar company information (legal name, tax ID, UBO) → Apenas via Crossramp Ops/Support
- Alterar reputational score manualmente → Score é calculado automaticamente pelo sistema
- Modificar fee tier → Tier é baseado em volume mensal (automático)
- Manipular fee percentages → Fees são determinados por tier + reputation (automático)

**Ações indiretas que afetam Company Profile:**

1. **Complete KYC** (via external link) → Muda `kyc_status` de `not_started` → `pending` → `verified`
2. **Improve payment success rate** (via melhor gestão de Templates/Payments) → Aumenta reputation score
3. **Reduce chargebacks** (via melhor atendimento ao cliente) → Aumenta reputation score
4. **Increase volume** (via mais vendas) → Sobe para tier superior (reduz base fee)
5. **Resolve disputes quickly** (via Disputes page) → Melhora reputation score

**Futuras write actions potenciais:**

- **Request KYC re-verification** - Merchant solicita re-check de documentos (se dados mudaram)
- **Update company information** - Formulário inline para editar endereço/telefone (sujeito a Ops approval)
- **Request reputation review** - Merchant disputa score baixo (submit appeal com evidências)
- **Request fee tier review** - Merchant argumenta que merece tier melhor (Enterprise negotiation)

Essas actions não existem atualmente (roadmap futuro).

---

## Guia interno do produto

### Quando usar
Merchant/Ops acessa Company Profile quando:
1. **Fee inquiry:** "Por que estou pagando 2.5% de fee?"
2. **Reputation check:** "Qual meu score? Por que é baixo?"
3. **Volume tracking:** "Quanto preciso processar para subir de tier?"
4. **KYC status:** "Meu KYC foi aprovado?"
5. **Benefits/Penalties clarity:** "O que ganho se melhorar meu score?"
6. **Compliance verification:** Confirmar que company info está correta (audit)
7. **Onboarding:** Novos merchants querem entender fee structure
8. **Troubleshooting:** "Por que minha fee mudou de um mês pro outro?"

### Reputational Score (0-100)

**Sistema de 5 níveis:**

| Level | Range | Color | Fee Multiplier | Fee Impact | Description |
|-------|-------|-------|----------------|------------|-------------|
| **Blocked** | 0-20 | Gray | 0x | Cannot transact | Merchant bloqueado (fraude, compliance issue grave) |
| **Low** | 20-40 | Yellow | 1.5x | +50% penalty | Merchant com problemas (alto chargeback, baixo success rate) |
| **Average** | 40-60 | Yellow-Orange | 1.2x | +20% penalty | Merchant mediano (performance OK mas pode melhorar) |
| **Good** | 60-80 | Orange | 1.0x | No change | Merchant bom (performance saudável, base fee sem ajuste) |
| **Excellent** | 80-100 | Primary Orange | 0.8x | -20% discount | Merchant excelente (performance top, ganha desconto) |

**Cálculo do score (5 fatores):**

1. **Payment Success Rate (30% weight)**
   - Medida: % de payments que completam com sucesso (não expiram, não falham)
   - Target: >95% = positive impact
   - Formula: `success_rate * 30`

2. **Chargeback Rate (25% weight)**
   - Medida: % de payments que viram chargeback
   - Target: <1% = positive, <0.5% = excellent
   - Formula: `(1 - chargeback_rate) * 25`

3. **Dispute Rate (20% weight)**
   - Medida: % de payments que viram dispute
   - Target: <2% = positive, <1% = excellent
   - Formula: `(1 - dispute_rate) * 20`

4. **KYC Compliance (15% weight)**
   - Medida: Status KYC (verified = 15, pending = 7.5, not_started = 0)
   - Target: verified = full points

5. **Account Age (10% weight)**
   - Medida: Dias desde criação da conta
   - Target: >365 days = 10 points, <90 days = 2 points (novos merchants começam baixo)
   - Formula: `min(account_age_days / 365, 1) * 10`

**Score final:** Soma dos 5 fatores (max 100)

**Recálculo:** Diariamente às 00:00 UTC (usa dados de últimos 30 dias)

**Exemplo de cálculo:**
- Payment success rate: 98.5% → 29.55 points (98.5% of 30)
- Chargeback rate: 0.2% → 24.95 points ((1 - 0.002) * 25)
- Dispute rate: 0.5% → 19.9 points ((1 - 0.005) * 20)
- KYC: verified → 15 points
- Account age: 347 days → 9.51 points (347/365 * 10)
- **Total:** 98.91 → rounded to **99** (Excellent level)

### Fee Tier (Volume-based)

**Sistema de 5 tiers:**

| Tier | Volume Range (Monthly) | Base Fee | Target Merchant |
|------|------------------------|----------|-----------------|
| **Tier 0** | Up to R$ 500k | 2.5% | Small merchants, startups |
| **Tier 1** | R$ 500k - R$ 1M | 2.0% | Growing merchants |
| **Tier 2** | R$ 1M - R$ 2.5M | 1.75% | Mid-size merchants |
| **Tier 3** | R$ 2.5M - R$ 5M | 1.5% | Large merchants |
| **Tier 4** | Above R$ 5M | 1.25% | Enterprise merchants |

**Volume calculation:**
- Based on **LAST MONTH total processed volume** (sum of all completed payments)
- Currency: BRL (se payment em USD/crypto, converte para BRL na data do payment)
- Updated: **Monthly** on 1st day of month (uses previous month data)

**Example:**
- November volume: R$ 1.8M
- December 1st: Merchant moves to Tier 2 (1.75% base fee)
- Fee stays 1.75% for entire December
- January 1st: Recalculates based on December volume

**First month:** New merchants start at Tier 0 (2.5%) until first full month completes

### Final Fee Calculation (The Math)

**Formula:** `Final Fee = Base Fee (from tier) × Reputation Multiplier`

**Example scenarios:**

#### Scenario 1: Good reputation, growing volume
- Volume: R$ 1.8M → Tier 2 (1.75% base)
- Reputation: 75 (Good) → 1.0x multiplier
- **Final Fee:** 1.75% × 1.0 = **1.75%**
- **Conclusion:** Merchant paga exatamente o base fee (no penalty, no discount)

#### Scenario 2: Excellent reputation, high volume
- Volume: R$ 6M → Tier 4 (1.25% base)
- Reputation: 92 (Excellent) → 0.8x multiplier
- **Final Fee:** 1.25% × 0.8 = **1.0%**
- **Conclusion:** Merchant ganha 20% discount! Paga apenas 1% (best possible rate)

#### Scenario 3: Low reputation, low volume (worst case)
- Volume: R$ 300k → Tier 0 (2.5% base)
- Reputation: 35 (Low) → 1.5x multiplier
- **Final Fee:** 2.5% × 1.5 = **3.75%**
- **Conclusion:** Merchant paga 50% a mais! Fee altíssimo (incentivo para melhorar)

#### Scenario 4: Blocked (cannot transact)
- Volume: Any
- Reputation: 15 (Blocked) → 0x multiplier
- **Final Fee:** Base × 0 = **Transactions disabled**
- **Conclusion:** Merchant CANNOT process payments (compliance block)

**Key insight:** Merchant pode economizar MUITO melhorando reputation:
- Low (35) → Good (65): 3.75% → 2.5% (savings: 33%)
- Good (65) → Excellent (85): 2.5% → 2.0% (savings: 20%)

Mesmo sem aumentar volume, apenas melhorar reputation = desconto imediato.

### KYC Status Flow

#### 1. **Not Started**
**Estado:** Merchant criou conta mas não submeteu documentos KYC.  
**Limitações:**
- Pode criar templates
- Pode receber payments (mas com limits: max R$ 10k/payment, R$ 50k/month)
- NÃO pode fazer withdrawals (fundos ficam locked até KYC)
- Reputation score limited (max 60, cannot reach Excellent)

**Banner:** Alert (red) "Action Required - Complete your KYC to unlock full features"  
**CTA:** "Complete KYC" button → Opens external Crossramp KYC flow  
**Timeline:** Merchant deve completar em 30 dias (após 30 dias, account suspended)

#### 2. **Pending (Under Review)**
**Estado:** Merchant submeteu documentos, Crossramp Ops está revisando.  
**Documentos exigidos:**
- CPF do UBO (selfie + documento)
- Proof of address (últimos 3 meses)
- Company articles (contrato social)
- UBO declaration (formulário assinado)

**Limitações:** Mesmas de "Not Started" (still limited)  
**Banner:** Alert (yellow) "Under Review - Our team is verifying your documents"  
**CTA:** None (must wait)  
**Timeline:** 1-5 business days (Ops SLA)

#### 3. **Verified**
**Estado:** Ops aprovou todos documentos, merchant fully verified.  
**Benefits unlocked:**
- No payment limits (can process any amount)
- Can withdraw funds (unlock locked balance)
- Reputation score unrestricted (can reach Excellent 80-100)
- Access to premium features (higher rate limits, priority support)

**Banner:** Info (blue/green) "Verified - Your account is fully verified by [UBO name] on [date]"  
**Badge:** "Verified" badge (success color)  
**Annual review:** KYC expires após 1 year, merchant deve re-verify (renewal flow)

### Campos principais explicados

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| **legal_name** | Razão social da empresa | "Comercio Digital LTDA" |
| **tax_id** | CNPJ (Brasil) | "12.345.678/0001-90" |
| **ubo_name** | Ultimate Beneficial Owner (dono real da empresa) | "Maria Silva Santos" |
| **reputational_score** | Score 0-100 (calculado diariamente) | 75 |
| **level** | Nível de reputação | "good", "excellent", "low", "blocked" |
| **fee_multiplier** | Multiplicador aplicado ao base fee | 1.0, 0.8, 1.2, 1.5, 0 |
| **last_month_volume** | Volume processado no mês anterior (BRL) | 1800000 (R$ 1.8M) |
| **current_tier** | Tier de fee baseado em volume | "tier_2" (R$ 1M - R$ 2.5M) |
| **base_fee_percent** | Fee base do tier (sem ajuste de reputation) | 2.0, 1.75, 1.25 |
| **final_fee_percent** | Fee final cobrado (base × reputation) | 2.0, 1.6, 3.0 |
| **kyc_status** | Status da verificação KYC | "verified", "pending", "not_started" |

### Casos extremos

#### 1. Merchant com volume alto mas reputation baixa
**Cenário:** Volume R$ 6M (Tier 4, base 1.25%) mas reputation 35 (Low, 1.5x).  
**Final fee:** 1.25% × 1.5 = **1.875%**  
**Problema:** Merchant paga MAIS que Tier 3 (1.5%) mesmo processando mais volume!  
**Explicar:** Reputation penalty é tão alto que anula benefit de tier superior.  
**Solução:** Merchant DEVE melhorar reputation (reduzir chargebacks, resolver disputes) antes de pensar em volume.

#### 2. Merchant blocked (score 0-20)
**Cenário:** Score 15 (Blocked), fee multiplier = 0.  
**Resultado:** Merchant CANNOT process ANY payments (transactions disabled).  
**Causa comum:**
- Fraud detected (múltiplos chargebacks em curto período)
- AML issue (transação suspeita flagged)
- KYC revoked (documentos falsos descobertos)
- Court order (bloqueio judicial)

**Ação:** Merchant deve contatar Crossramp Compliance imediatamente. Score não volta sozinho.  
**Desbloqueio:** Apenas após Compliance investigar e aprovar (pode levar 7-30 dias).

#### 3. Score caiu de repente (ex: 75 → 40)
**Cenário:** Merchant estava Good (75), de repente virou Average (40).  
**Causa provável:**
1. Spike de chargebacks (ex: produto defeituoso gerou 10 chargebacks em 1 semana)
2. Payment success rate dropped (template mal configurado, muitos payments expirando)
3. Multiple disputes opened (customers unhappy, opening disputes)

**Timeline:** Score usa dados de últimos 30 dias. Drop súbito indica problema RECENTE.  
**Ação urgente:**
1. Ir para Disputes page → Ver quais disputes estão abertos
2. Ir para Payments page → Filtrar failed/expired payments (por que falharam?)
3. Contactar customers infelizes → Resolver antes de virar chargeback
4. Pausar campanhas → Reduzir volume até resolver issues

**Recovery:** Se merchant resolve problemas, score volta a subir gradualmente (30 dias para refletir fully).

#### 4. Fee mudou de um mês pro outro
**Cenário:** Merchant pagava 1.75% em November, agora paga 2.0% em December.  
**Causa 1 (Volume drop):** November volume R$ 1.2M (Tier 2), December volume R$ 800k (Tier 1).  
**Causa 2 (Reputation drop):** Reputation caiu de Good (1.0x) para Average (1.2x).  
**Causa 3 (Combo):** Volume caiu E reputation caiu (double penalty).

**Explicar:** Fees são recalculadas mensalmente (volume) e diariamente (reputation).  
**Transparência:** Merchant pode ver exatamente o que mudou (volume tier ou reputation).  
**Prevenção:** Merchant deve monitorar volume monthly e reputation daily (evitar surpresas).

#### 5. Tier próximo mas não alcançou
**Cenário:** Volume R$ 990k (faltaram R$ 10k para Tier 1).  
**Frustração:** Merchant quase alcançou tier melhor (2.0% ao invés de 2.5%).  
**Solução:** UI mostra "You need R$ 10k more to reach next tier" (incentivo para processar mais).  
**Gaming risk:** Merchant pode criar payments fake para atingir volume (FRAUD).  
**Detection:** Crossramp Ops monitora patterns suspeitos (ex: 50 payments de R$ 200 no último dia do mês).

#### 6. KYC pending há >7 dias
**Cenário:** Merchant submeteu docs há 10 dias, ainda pending.  
**SLA normal:** 1-5 business days (95% dos casos).  
**Causa de atraso:**
1. Documentos incompletos/ilegíveis (Ops pediu re-submit)
2. Name mismatch (nome no CPF ≠ nome no contrato social)
3. Backlog de Ops (período de alto volume de KYCs)
4. Compliance hold (transação suspeita durante review)

**Ação:** Merchant deve contatar support após 7 dias (escalation).  
**Urgente:** Se merchant tem payments locked aguardando KYC (dinheiro parado).

#### 7. Reputation Excellent mas fee não mudou
**Cenário:** Merchant melhorou score de 65 → 85 (Good → Excellent) mas fee continua 2.0%.  
**Explicar:** Fee atual já era Good (1.0x multiplier). Excellent também 0.8x.  
**Math:** 2.0% × 1.0 = 2.0% (Good) vs 2.0% × 0.8 = 1.6% (Excellent).  
**Erro de merchant:** Não percebeu que FEE MUDOU SIM (2.0% → 1.6% = 20% discount!).  
**UI clarity:** Fee breakdown tooltip mostra adjustment (-20%) claramente.

#### 8. Volume em USD mas tier em BRL
**Cenário:** Merchant processa payments em USDC (stablecoin USD).  
**Conversão:** Backend converte USD → BRL usando taxa do dia do payment.  
**Example:**
- Payment: $1000 USDC
- FX rate: 1 USD = 5.2 BRL
- Volume counted: R$ 5.200

**Total volume:** Sum de todos payments (BRL + convertidos).  
**FX fluctuation:** Se BRL deprecia, merchant pode subir de tier sem aumentar volume USD (lucky!).

### Notas para Ops/CS

#### Troubleshooting comum

**"Por que minha fee é tão alta?"**
- **Verificar:**
  1. Qual tier? (volume baixo = fee alta)
  2. Qual reputation? (Low/Average = penalty)
  3. Final fee = base × multiplier (mostrar math)
- **Solução:** Explicar que merchant pode reduzir fee de 2 formas:
  1. Aumentar volume (subir de tier)
  2. Melhorar reputation (ganhar discount)

**"Meu score caiu, por quê?"**
- **Investigar:**
  1. Ver `factors` no response (qual fator teve impact negativo?)
  2. Chargeback rate aumentou? Dispute rate aumentou? Success rate caiu?
  3. Timeline: mudança recente ou gradual?
- **Solução:** Identificar root cause (ex: chargebacks) e dar dicas para melhorar.

**"Quero desconto na fee"**
- **Explicar:** Fees são automáticas (tier + reputation), não há negociação manual.
- **Exception:** Enterprise merchants (>R$ 10M/mês) podem ter custom pricing (contactar sales).
- **Alternativa:** Mostrar como merchant pode "ganhar desconto" melhorando reputation:
  - Low → Good: 50% reduction in penalty
  - Good → Excellent: 20% discount

**"Meu KYC não foi aprovado"**
- **Verificar:** Ver `documents_submitted` → qual doc foi rejected?
- **Causas comuns:**
  1. CPF photo blurred (pedir nova selfie)
  2. Proof of address >3 months old (pedir recente)
  3. Company articles outdated (pedir versão atual)
  4. Name mismatch (corrigir cadastro)
- **Ação:** Merchant re-submit docs corretos (volta para pending).

**"Fui bloqueado (score <20), o que fazer?"**
- **Critical:** Blocked = fraude ou compliance grave.
- **Ação imediata:**
  1. Escalate to Compliance team (não resolve via CS)
  2. Merchant NÃO pode transacionar até desbloqueado
  3. Funds podem ficar frozen (depende do caso)
- **Timeline:** 7-30 dias (investigation + resolution).
- **Outcome:** Unblock (restore score) OU permanent ban (close account).

**"Tier não atualizou no início do mês"**
- **Verificar:** Calculation runs on 1st day às 00:00 UTC.
- **Se hoje é dia 1:** Aguardar algumas horas (batch process pode atrasar).
- **Se >dia 2:** Bug possível, escalar para dev team.
- **Workaround:** Refetch `/api/company/fee-tier` (pode ser cache stale).

### Melhorias futuras

1. **Score breakdown chart:** Gráfico de linha mostrando evolução do score ao longo de 6 meses
2. **Factor details:** Expandir cada factor (payment success, chargeback, etc) com sub-metrics
3. **Volume projection:** "If you process R$ X more this month, you'll reach Tier Y"
4. **Reputation tips:** Actionable suggestions "Reduce chargebacks by improving product quality"
5. **Fee savings calculator:** "If you improve from Good to Excellent, you'll save R$ X/month"
6. **Tier timeline:** Calendar showing "On Dec 1st, you moved from Tier 1 to Tier 2"
7. **KYC document uploader:** Upload docs directly in UI (no external link)
8. **Reputation alerts:** Email when score drops >10 points (early warning)
9. **Competitor comparison:** "Your fee (1.75%) vs industry average (2.2%)" (benchmark)
10. **Custom fee negotiation:** Enterprise merchants request custom pricing via form
11. **Score appeal:** Merchant can dispute low score (submit evidence for review)
12. **Fee history:** Table showing fee paid each month (historical tracking)
13. **Volume heatmap:** Calendar heatmap showing daily volume (identify patterns)
14. **Reputation leaderboard:** "You rank #342 out of 5000 merchants" (gamification)
15. **Predicted tier:** "Based on current month volume, you'll be in Tier X on next month"

### Best practices para compartilhar com merchants

1. **Monitor score weekly:** Check Company Profile toda semana (catch drops early)
2. **Improve reputation first:** Easier to improve score than increase volume 10x
3. **Target Excellent (80+):** 20% discount is significant savings (worth the effort)
4. **Track chargebacks:** #1 factor hurting reputation (customer service is key)
5. **Complete KYC ASAP:** Unlocks full features + boosts reputation score
6. **Plan volume growth:** Know your current tier, set goal for next tier
7. **Understand fee math:** Base fee × reputation = final fee (transparency matters)
8. **Use tooltips:** Hover over icons/fees (UI has lots of helpful explanations)
9. **View Reputation Statement:** Detailed breakdown of score factors (more granular)
10. **Don't game the system:** Fake payments to boost volume = fraud (will be detected)

### Reputation factors deep dive

#### Payment Success Rate (30% weight)
**What counts as success:**
- Payment completed (customer paid, funds received)
- NOT expired (customer didn't pay before deadline)
- NOT failed (technical error, blockchain issue)

**Formula:** `(completed_payments / total_payments) × 100`

**Example:**
- 100 payments created
- 95 completed, 3 expired, 2 failed
- Success rate: 95% ✓ (Good)

**How to improve:**
- Extend payment expiration (15 min → 30 min)
- Use faster blockchains (TRX/SOL vs BTC)
- Send payment reminder to customers (email/SMS)
- Simplify checkout flow (reduce abandonment)

#### Chargeback Rate (25% weight)
**What counts as chargeback:**
- Customer disputes payment with bank/card issuer
- Merchant automatically loses funds (reversed)
- High chargeback = fraud risk

**Formula:** `(chargebacks / completed_payments) × 100`

**Thresholds:**
- <0.5%: Excellent (25 points)
- 0.5-1%: Good (20 points)
- 1-2%: Average (15 points)
- >2%: Low/Blocked (<10 points)

**Example:**
- 1000 completed payments
- 2 chargebacks
- Chargeback rate: 0.2% ✓ (Excellent)

**How to improve:**
- Improve product quality (reduce returns)
- Clear product descriptions (manage expectations)
- Fast customer support (resolve before chargeback)
- Request signature confirmation (proof of delivery)

#### Dispute Rate (20% weight)
**What counts as dispute:**
- Customer opens dispute via Crossramp (before chargeback)
- Merchant has chance to respond/resolve
- Lower than chargeback (good sign)

**Formula:** `(disputes / completed_payments) × 100`

**Thresholds:**
- <1%: Excellent (20 points)
- 1-2%: Good (15 points)
- 2-3%: Average (10 points)
- >3%: Low (<5 points)

**How to improve:**
- Respond to disputes quickly (within 24h)
- Provide evidence (tracking number, chat logs)
- Offer partial refunds (compromise)
- Improve product/service (root cause)

#### KYC Compliance (15% weight)
**Scoring:**
- Verified: 15 points ✓
- Pending: 7.5 points
- Not started: 0 points

**Simple:** Just complete KYC = instant +15 points boost.

**Note:** KYC also unlocks other benefits (no limits, can withdraw).

#### Account Age (10% weight)
**Formula:** `min(account_age_days / 365, 1) × 10`

**Examples:**
- 30 days old: 0.82 points (new merchant)
- 90 days old: 2.47 points
- 180 days old: 4.93 points
- 365 days old: 10 points ✓ (maxed)

**Can't rush:** Must wait for account to age naturally.

**Rationale:** Older merchants = more trustworthy (established track record).

### Fee tier strategy guide

**For small merchants (starting out):**
- Start at Tier 0 (2.5%), accept it
- Focus on reputation (easier to control than volume)
- Target: Excellent reputation (0.8x) = effective 2.0% (better than Tier 1!)
- Once stable, then grow volume

**For growing merchants (R$ 500k - R$ 2M):**
- You're in Tiers 1-2 (2.0% - 1.75%)
- Optimize: Balance reputation + volume growth
- Quick wins: Reduce chargebacks (boost reputation)
- Long-term: Marketing campaigns (grow volume to Tier 3)

**For large merchants (>R$ 5M):**
- You're at Tier 4 (1.25% base)
- Further optimization: Excellent reputation (0.8x) = effective 1.0%
- That's as low as it gets (best rate)
- Consider: Enterprise custom pricing (if >R$ 10M/month)

**For enterprise (>R$ 10M):**
- Contact Crossramp sales for custom pricing
- Potential: <1% fees (negotiated)
- Benefits: Dedicated account manager, priority support, custom integrations