# Feature Documentation: Payments (Transactions)

**Status:** ✅ **100% COMPLETE** (Queries + Commands + Full Integration)  
**Componente de View:** `/src/app/views/TransactionsView.tsx`  
**Componente de Modal:** `/src/app/components/admin/PaymentDetailsModal.tsx`  
**ID de Rota/Navegação:** `payments` (routed from Reports section)  
**API Contract:** `/docs/API_CONTRACT_PAYMENTS.md`

## ✅ Implementation Checklist

- [x] **Query Functions** - `queryPaymentsList()`, `queryPaymentSearch()`, `queryPaymentDetails()` in `/src/app/lib/queries.ts`
- [x] **Command Functions** - `commandRefundPayment()`, `commandCancelPayment()` in `/src/app/lib/commands.ts`
- [x] **View Integration** - TransactionsView uses centralized query system with `useQuery` hook
- [x] **RBAC Enforcement** - Access control for Admin/Operations/Analyst roles
- [x] **Loading States** - Skeleton loaders and loading spinners
- [x] **Error States** - Error banners with retry functionality
- [x] **Empty States** - No payments found message
- [x] **Quick Search** - Functional search with `queryPaymentSearch()`
- [x] **Pagination** - Working Previous/Next buttons with backend integration
- [x] **Date Range Filter** - Applies to query parameters
- [x] **Type Filter** - All/Received/Sent filter works
- [x] **Refund Flow** - Connected to `commandRefundPayment()` with MFA
- [x] **Translations** - Complete EN/PT/ES translations including error states
- [x] **Mock Mode** - Generates realistic mock payments (73 transactions)
- [x] **API Documentation** - Complete API contract documentation

## História de usuário

**Como** administrador ou operador do Crossramp,  
**Eu quero** visualizar, filtrar e buscar todas as transações de pagamentos (recebidos e enviados) com seus detalhes completos e histórico,  
**Para que** eu possa reconciliar movimentações financeiras, auditar transações específicas por múltiplos identificadores, processar reembolsos quando necessário, e responder rapidamente a dúvidas de clientes sobre status de pagamentos.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso **full** (read + write)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (vê transactions mas não pode refund)
  - Developer não tem acesso (página não aparece na navegação)
- **Two-tier search system:**
  1. **Quick Search** - Card no topo com busca direta por: Transaction ID, External ID, Client ID, Tx Hash, ou Address
     - Busca abre modal de detalhes se encontrado
     - Mostra erro "Payment not found" se não encontrado
  2. **General search** - Expandable search bar dentro do filter card (para filtrar lista visível)
- **Date range selector** - Filtrar transactions por período (default: últimos 30 dias)
- **Type filter pills** - All, Received (payments in), Sent (withdrawals/payments out)
- **List view:** Cards horizontais com:
  - Icon: ArrowDownLeft (received, bg-foreground/5) ou ArrowUpRight (sent, bg-muted)
  - Description: "Payment from merchant #3421" ou "Withdrawal to wallet 0x742d..."
  - Relative time: "2 hours ago", "Yesterday", "3 days ago"
  - Transaction ID (monospace font)
  - Amount em BRL: "+R$ 1.450,00" (received) ou "-R$ 2.500,00" (sent)
  - Amount em crypto: "285.20 USDT" (secondary info)
  - Status badge: Completed (green/foreground), Pending (yellow), Failed (red)
- **Modal de detalhes:** Dialog com todas informações técnicas:
  - **Refund banner** (se elegível: within 7 days, type=received, state=completed)
  - **Timestamps**: Created at, Updated at
  - **Identifiers**: Address (copyable), Checkout URL (link + copyable), Template, Process (onramp/offramp)
  - **Values**: Entry value + currency, Exit value + currency, Effective rate, Base rate
  - **Client info**: Client ID (CPF/CNPJ), External ID (merchant's order ID)
  - **Blockchain**: Wallet address (copyable), Tx Hash (copyable + blockchain explorer link)
  - **Status**: State, Expiration date, Expired flag
- **Refund action (write):**
  - Botão "Refund" com Lock icon (aparece apenas se elegível)
  - Abre RefundConfirmationModal → MFAModal → processa refund
  - Elegibilidade: ≤7 days old, type=received, state=completed
- **Pagination:** 10 transactions per page, Previous/Next buttons com indicador de página
- **Request Report:** Botão no header para solicitar export PDF/CSV (abre RequestReportModal)
- **Responsive:** Mobile-friendly com amounts alinhados direita, cards stacking

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Listar transações** | `GET` | `/api/payments/list` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "type": "all", "page": 1, "limit": 10, "sort_by": "date", "sort_order": "desc" }` | `{ "payments": [{ "id": "tx_001", "type": "received", "amount": "1450.00", "amount_display": "R$ 1.450,00", "amount_crypto": "285.20", "currency_crypto": "USDT", "currency_fiat": "BRL", "description": "Payment from merchant #3421", "status": "completed", "date": "2025-12-16T10:30:00Z", "fee": "14.50", "fee_display": "R$ 14,50", "external_id": "ORD-3421", "client_id": "03476666006", "process": "onramp" }], "pagination": { "current_page": 1, "total_pages": 8, "total_count": 73, "per_page": 10 } }` | **B** (Categoria B - Load once + soft refresh 60s) | Toast "Failed to load payments" + empty state com Retry button |
| **Buscar transação por identificador** | `GET` | `/api/payments/search` | `{ "query": "tx_001" }` | `{ "found": true, "payment": { "id": "tx_001", "type": "received", ... } }` OU `{ "found": false }` | **B** (Categoria B - On-demand search) | Toast "Payment not found" (se found=false) ou "Search failed, try again" |
| **Obter detalhes completos da transação** | `GET` | `/api/payments/details` | `{ "payment_id": "tx_001" }` | `{ "id": "tx_001", "type": "received", "amount": "1450.00", "currency_fiat": "BRL", "amount_crypto": "285.20", "currency_crypto": "USDT", "description": "Payment from merchant #3421", "status": "completed", "date": "2025-12-16T10:30:00Z", "fee": "14.50", "created_at": "2025-12-16T10:30:00Z", "updated_at": "2025-12-16T10:32:15Z", "address": "NOXD0F30710AFD24ED5B0O1C19BFA00C64F", "checkout_url": "https://checkout.crossramp.io/e2e/NOXD0F30710AFD24ED5B0O1C19BFA00C64F", "template": "fast_usdt_base", "process": "onramp", "entry_value": "1450.00", "entry_currency": "BRL", "exit_value": "285.20", "exit_currency": "USDT", "effective_rate": "5.08", "base_rate": "5.08", "client_id": "03476666006", "external_id": "ORD-3421", "wallet": "0x91D8AAB34A1F54BE2E168A4266685b407102b819", "tx_hash": "0x91D8AAB34A1F54BE2E168A4266685b407102b819", "blockchain_explorer_url": "https://etherscan.io/tx/0x91D8AAB34A1F54BE2E168A4266685b407102b819", "state": "Completed", "expiration_date": "2025-12-16T10:45:00Z", "expired": false, "is_refundable": true, "refund_deadline": "2025-12-23T10:30:00Z" }` | **B** (Categoria B - Load on modal open) | Toast "Failed to load payment details" + fechar modal |

**Notas sobre classificação de queries:**

- **List payments (Categoria B):** Transações mudam com frequência média (novos pagamentos chegando, status updates). Fetch inicial + soft refresh a cada 60s enquanto página está visível e usuário não está interagindo. Refetch imediato ao retornar ao tab.
  
- **Search payment (Categoria B):** Busca on-demand disparada pelo Quick Search form. Não precisa de polling.

- **Payment details (Categoria B):** Carregado ao clicar em uma transação (abrir modal). Não precisa de polling (snapshot estático no momento de abertura).

**Search capabilities:**
A busca por identificador (`/api/payments/search`) deve procurar em múltiplos campos:
- `id` (Transaction ID ex: tx_001)
- `external_id` (Merchant's order ID ex: ORD-3421)
- `client_id` (CPF/CNPJ do cliente ex: 03476666006)
- `tx_hash` (Blockchain transaction hash ex: 0x91D8AAB34A1F54BE2E168A4266685b407102b819)
- `address` (Checkout address ex: NOXD0F30710AFD24ED5B0O1C19BFA00C64F)
- `wallet` (Destination wallet ex: 0x91D8AAB34A1F54BE2E168A4266685b407102b819)

Backend deve fazer search case-insensitive e partial match (ex: busca "tx_00" retorna "tx_001").

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| **Processar refund** | `POST` | `/api/payments/refund` | `{ "payment_id": "tx_001", "refund_amount": "1450.00", "refund_reason": "Customer requested refund - product not as described", "full_refund": true, "notify_customer": true, "mfa_code": "123456" }` | Toast "Refund processed successfully. Customer will receive R$ 1,450.00 within 1-3 business days." + Fechar modal + Refetch payments list | ✓ |
| **Cancelar pagamento pendente** | `POST` | `/api/payments/cancel` | `{ "payment_id": "tx_004", "cancellation_reason": "Customer request", "mfa_code": "123456" }` | Toast "Payment cancelled successfully" + Fechar modal + Refetch payments list | ✓ |

**Detalhes sobre "Processar refund":**
- **Requer MFA:** Sim (double-confirm via RefundConfirmationModal + MFAModal)
- **Validações backend esperadas:**
  - `payment_id` existe e pertence ao merchant
  - Payment type = `received` (não pode refund withdrawals)
  - Payment state = `completed` ou `success` (não pode refund pending/failed)
  - Payment age ≤ 7 dias (refund window)
  - `refund_amount` ≤ payment amount original (permitir partial refunds)
  - `refund_reason` obrigatório, max 500 chars
  - Merchant tem saldo suficiente para processar refund
  - Payment ainda não foi refunded (check for duplicate refund)
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Backend cria refund transaction (type=`refund`, linked to original payment)
  - Debita valor do saldo merchant
  - Credita valor de volta para customer (via PIX ou blockchain)
  - Envia notificação ao customer (se `notify_customer: true`)
  - Payment original recebe flag `refunded: true` e link para `refund_id`
  - Frontend refetch `/api/payments/list`
  - Modal fecha
  - Toast de sucesso com timeline estimado (1-3 business days)
- **Partial refund:**
  - Se `refund_amount < payment.amount`, payment fica marcado como `partially_refunded: true`
  - Fee original NÃO é refundado (merchant absorve fee mesmo em refund)
  - Se `full_refund: false`, merchant deve especificar `refund_amount` exato
- **Refetch após sucesso:** Sim - Categoria B com debounce 500ms

**Detalhes sobre "Cancelar pagamento pendente":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `payment_id` existe e pertence ao merchant
  - Payment state = `pending` (não pode cancelar completed/failed)
  - Payment type = `received` (withdrawals pending são cancelados via Withdraw page)
  - `cancellation_reason` obrigatório, max 500 chars
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Payment state muda para `cancelled`
  - Checkout URL é invalidado (customer não pode mais pagar)
  - Customer recebe notificação (se checkout estava aberto)
  - Frontend refetch `/api/payments/list`
  - Modal fecha
- **Edge case:** Se customer já pagou mas blockchain confirmation ainda não chegou, cancelamento falha com erro "Payment is processing, cannot cancel"
- **Refetch após sucesso:** Sim - Categoria B

---

## Guia interno do produto

### Quando usar
Merchant/Ops acessa Payments quando:
1. **Reconciliação diária:** Verificar se todos pagamentos recebidos batem com vendas
2. **Customer support:** Cliente pergunta "onde está meu pagamento?" → buscar por Order ID ou CPF
3. **Processar refunds:** Cliente solicitou devolução → encontrar transaction → refund
4. **Auditoria:** Verificar fees cobrados, taxas de conversão, tempos de processamento
5. **Troubleshooting:** Payment stuck em pending → ver detalhes técnicos no modal
6. **Export financeiro:** Solicitar relatório de todas transações do mês (CSV para contabilidade)

### Dependências
- **Templates:** Cada payment usa um template (define fee structure, branding)
- **Balances:** Refunds debitam do saldo merchant
- **Disputes:** Payments podem ter disputas vinculadas (cross-reference)
- **Blockchain explorers:** Tx hash links para Etherscan, Tronscan, Solscan
- **Auth0 + RBAC:** Apenas Admin e Operations podem refund; Analyst apenas visualiza

### Tipos de transação (type)

#### 1. **Received (Payments In / Onramp)**
**O que é:** Pagamentos que o merchant recebeu de clientes (vendas, checkouts).

**Fluxo:**
1. Merchant cria checkout usando template
2. Customer acessa checkout URL
3. Customer paga via PIX ou cripto
4. Crossramp converte para moeda desejada
5. Merchant recebe valor em stablecoin ou BRL

**Process:** `onramp` (fiat → crypto ou fiat → fiat)

**Exemplo:**
- Customer paga R$ 1.450 via PIX
- Crossramp converte para 285.20 USDT (taxa 5.08)
- Merchant recebe USDT na wallet

**Refundable:** ✅ Sim (se ≤7 dias e completed)

#### 2. **Sent (Payments Out / Offramp / Withdrawals)**
**O que é:** Saques que o merchant fez (retirada de fundos para banco ou wallet).

**Fluxo:**
1. Merchant solicita withdrawal na página Withdraw
2. Especifica valor, moeda, destino (PIX ou wallet)
3. Crossramp valida whitelist + saldo
4. Processa transferência
5. Merchant recebe no banco ou wallet

**Process:** `offramp` (crypto → fiat ou crypto → crypto)

**Exemplo:**
- Merchant tem 491.80 USDT
- Solicita withdrawal para conta PIX
- Recebe R$ 2.500 (taxa 5.08)

**Refundable:** ❌ Não (withdrawals não são refundable, são irreversíveis)

### Status de pagamento (status / state)

| Status | Significado | O que fazer | Refundable? |
|--------|-------------|-------------|-------------|
| **Pending** | Aguardando pagamento do cliente | Aguardar ou cancelar (se demorar muito) | ❌ |
| **Completed / Success** | Pagamento confirmado e processado | Nenhuma ação (tudo certo) | ✅ (se ≤7 dias) |
| **Failed** | Pagamento falhou (expired, insufficient funds, blockchain error) | Investigar motivo + pedir customer tentar novamente | ❌ |
| **Cancelled** | Merchant ou customer cancelou manualmente | Nenhuma ação (já encerrado) | ❌ |
| **Refunded** | Pagamento foi reembolsado | Nenhuma ação (dinheiro devolvido) | ❌ |
| **Partially Refunded** | Parte do valor foi reembolsado | Pode refund o restante (se ainda ≤7 dias) | ✅ (valor restante) |

### Campos principais explicados

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| **id** | Transaction ID único do Crossramp | `tx_001` |
| **external_id** | Order ID do sistema do merchant (opcional) | `ORD-3421` |
| **client_id** | CPF ou CNPJ do cliente que pagou | `03476666006` |
| **address** | Identificador único do checkout | `NOXD0F30710AFD24ED5B0O1C19BFA00C64F` |
| **checkout_url** | URL do checkout (se onramp) | `https://checkout.crossramp.io/e2e/NOXD0F30...` |
| **template** | Template usado (define fee structure) | `fast_usdt_base` |
| **process** | Direção do fluxo | `onramp` (in) ou `offramp` (out) |
| **entry_value** | Valor de entrada | `1450.00` (BRL que customer pagou) |
| **exit_value** | Valor de saída | `285.20` (USDT que merchant recebeu) |
| **effective_rate** | Taxa de conversão real aplicada | `5.08` (1 USDT = R$ 5.08) |
| **base_rate** | Taxa de conversão base (sem spread) | `5.08` |
| **fee** | Taxa cobrada pela transação | `14.50` (1% de 1450) |
| **wallet** | Endereço da wallet destino | `0x91D8AAB34A1F54BE2E168A4266685b407102b819` |
| **tx_hash** | Hash da transação blockchain | `0x91D8AAB34A1F54BE2E168A4266685b407102b819` |
| **expiration_date** | Data de expiração do checkout (se onramp) | `2025-12-16T10:45:00Z` (15 min típico) |
| **expired** | Flag se checkout expirou sem pagamento | `false` |

### Casos extremos

#### 1. Refund após 7 dias (window expirado)
**Cenário:** Customer pede refund no dia 10 mas payment foi há 8 dias.  
**Tratamento:**
- Frontend: Botão "Refund" não aparece no modal (não elegível)
- Backend: Se payload enviado mesmo assim, retorna 400 "Refund window expired (max 7 days)"
- **Solução para merchant:** Processar refund manualmente fora do sistema (via PIX direto) e documentar

#### 2. Refund sem saldo suficiente
**Cenário:** Payment foi R$1.000, merchant já sacou tudo, saldo atual = R$100.  
**Tratamento:**
- Backend valida saldo antes de processar
- Retorna 400 "Insufficient balance. You have R$ 100.00 but R$ 1,000.00 is required for this refund."
- Frontend mostra toast: "Cannot process refund. Insufficient balance. Please add funds to your account."
- **Solução:** Merchant deposita fundos OU aguarda receber novos pagamentos

#### 3. Duplicate refund request (double-click)
**Cenário:** Merchant clica "Refund" duas vezes rapidamente (UI lag).  
**Tratamento:**
- Backend verifica se payment já tem `refunded: true` ou `refund_id` não-nulo
- Segunda request retorna 400 "Payment already refunded (refund_id: rfd_123)"
- Frontend desabilita botão após primeiro click (loading state) para prevenir

#### 4. Partial refund
**Cenário:** Payment foi R$1.000, customer devolveu apenas 1 dos 2 produtos (R$500 cada).  
**Tratamento:**
- Frontend: RefundConfirmationModal permite editar `refund_amount` (default = full amount)
- Merchant digita R$500 (metade)
- Backend processa partial refund:
  - Cria refund transaction de R$500
  - Payment original fica `partially_refunded: true`
  - Payment ainda elegível para refund adicional (até completar R$1.000)
- **Nota:** Fee original (R$10) NÃO é refundado. Merchant perde fee mesmo em partial refund.

#### 5. Customer já iniciou dispute
**Cenário:** Payment está em disputa (customer abriu reclamação), merchant tenta refund direto.  
**Tratamento:**
- Backend checa se payment tem `dispute_id` vinculado com status `open` ou `under_review`
- Retorna 400 "Cannot refund payment with open dispute. Resolve dispute first or refund via Disputes page."
- **Solução:** Ir para Disputes page → clicar "Refund & Resolve" na disputa (fecha disputa + processa refund em uma ação)

#### 6. Blockchain transaction não confirmado (pending onchain)
**Cenário:** Payment state = `pending`, customer diz "já paguei!", merchant tenta cancelar.  
**Tratamento:**
- Backend verifica se blockchain transaction já foi transmitida (checking mempool)
- Se tx está em mempool (confirmações=0 mas broadcast feito) → retorna 400 "Payment is processing, cannot cancel. Wait for confirmation."
- Se tx não existe → cancellation OK
- **Timeline:** Aguardar 10-30 minutos (blockchain confirmation time)

#### 7. Payment com múltiplas moedas (crypto + fiat)
**Cenário:** Template aceita USDT + BRL, customer pagou mix (R$500 PIX + 50 USDT).  
**Tratamento:**
- Backend armazena breakdown: `payment_methods: [{ type: 'pix', amount: 500, currency: 'BRL' }, { type: 'blockchain', amount: 50, currency: 'USDT' }]`
- Modal mostra ambos valores
- Refund processa proporcional em ambas moedas (refund R$500 via PIX + 50 USDT via blockchain)
- **Complexidade:** Refund pode demorar mais (duas transações separadas)

#### 8. Expired checkout mas customer pagou (race condition)
**Cenário:** Checkout expira 10:45, customer paga 10:44:59, confirmação chega 10:46.  
**Tratamento:**
- Backend aceita payment mesmo após expiration se transaction foi iniciada ANTES de expirar
- Payment state = `completed` (não `expired`)
- **Grace period:** Backend aceita pagamentos até 5 minutos após expiration oficial

### Notas para Ops/CS

#### Troubleshooting comum

**"Cliente diz que pagou mas não aparece no sistema"**
- **Investigar:**
  1. Buscar por CPF/CNPJ do cliente (client_id)
  2. Verificar se payment está em `pending` (aguardando confirmação blockchain)
  3. Checar se checkout expirou (`expired: true`) antes do pagamento
- **Solução:**
  - Se pending: "Payment is processing, wait 10-30 minutes"
  - Se expired: "Checkout expired before payment. Customer must create new order."
  - Se não encontrado: "Payment not received. Check if customer used correct checkout URL."

**"Quero cancelar um payment mas botão não aparece"**
- **Motivo:** Botão de cancelar só aparece se `status: pending`
- **Se completed:** Não pode cancelar, apenas refund (se ≤7 dias)
- **Se failed:** Já está encerrado, não precisa cancelar

**"Refund não está funcionando"**
- **Verificar:**
  1. Payment age ≤ 7 dias? (se >7 dias, window expirou)
  2. Type = `received`? (não pode refund withdrawals)
  3. State = `completed`? (não pode refund pending/failed)
  4. Saldo suficiente? (merchant precisa ter fundos)
- **Erro comum:** "Refund window expired" → Processar manualmente

**"Taxa de conversão parece errada"**
- **Explicar:**
  - `base_rate`: Taxa pura de mercado (ex: 1 USDT = R$ 5.08)
  - `effective_rate`: Taxa com spread do Crossramp (ex: 1 USDT = R$ 5.10)
  - Diferença = spread (tipicamente 0.5-1%)
- **Exemplo:** Customer pagou R$ 1.450, recebeu 285.20 USDT → 1.450 / 285.20 = R$ 5.08/USDT
- **Se discrepância grande:** Verificar se houve spike de volatilidade no momento do payment

**"Tx hash não abre no explorer"**
- **Causa:** Hash pode estar errado OU transação ainda não foi broadcast para blockchain
- **Solução:**
  1. Verificar se payment state = `completed` (se pending, tx hash ainda não existe)
  2. Copiar tx hash e colar manualmente no explorer correto:
     - ETH/USDC-ETH → Etherscan.io
     - TRX/USDT-TRX → Tronscan.org
     - SOL/USDT-SOL → Solscan.io
  3. Se hash ainda não aparece: Aguardar 5-10 minutos (blockchain delay)

**"Customer quer refund mas já passou 10 dias"**
- **Policy:** Refund window = 7 dias (hard limit)
- **Exceções:** Apenas com aprovação de compliance (casos especiais)
- **Solução manual:**
  1. Merchant processa transferência PIX ou blockchain fora do sistema
  2. Documenta na contabilidade como "Manual refund for tx_001"
  3. Notifica customer via email/WhatsApp

### Melhorias futuras

1. **Filtro avançado:** Multi-select status, range de valores, filtrar por template
2. **Bulk actions:** Selecionar múltiplos payments pending e cancelar todos
3. **Export inline:** Botão "Export this page to CSV" (sem precisar Request Report)
4. **Timeline visual:** Mostrar linha do tempo do payment (created → confirmed → settled)
5. **Push notifications:** Alert quando payment pending completa ou fails
6. **Refund tracking:** Mostrar status do refund processing (pending → sent → confirmed)
7. **Split payments:** Suporte para payments com revenue split (mostrar breakdown no modal)
8. **Recurring payments:** Flag para payments recorrentes (subscriptions)
9. **Customer notes:** Campo para merchant adicionar notas sobre payment (ex: "Customer requested rush delivery")
10. **Blockchain confirmation count:** Mostrar quantas confirmações blockchain (1/6, 6/6, etc.)

### Best practices para compartilhar com merchants

1. **Use external_id:** Sempre passar order ID do seu sistema como `external_id` para rastreabilidade
2. **Check daily:** Revisar payments pending todos os dias (>24h pending = possível problema)
3. **Document refunds:** Antes de refund, anotar motivo em sistema externo (CRM, planilha)
4. **7-day window:** Avisar customers sobre policy de refund de 7 dias (não deixar passar)
5. **Reconcile weekly:** Comparar total de payments com extrato bancário semanalmente
6. **Save tx_hash:** Sempre copiar tx_hash de payments grandes (>R$10k) para auditoria
7. **Monitor failed:** Se failed rate > 10%, investigar (pode ser problema de template ou fees muito altas)
8. **Partial refunds:** Preferir partial refunds quando possível (evita perder venda completa)
9. **Quick response:** Responder dúvidas de customers sobre payments em <2 horas (evita disputes)
10. **Export monthly:** Baixar CSV de todos payments do mês para contabilidade (facilita IR)