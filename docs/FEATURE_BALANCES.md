# Feature Documentation: Balances (Accounts)

**Componente de View:** `/src/app/views/AccountsView.tsx`  
**ID de Rota/Navegação:** `accounts` (main navigation)

## História de usuário

**Como** administrador ou operador do Crossramp,  
**Eu quero** visualizar todas as minhas contas (multi-moeda e multi-rede) com breakdown detalhado de saldos (disponível, bloqueado, a receber, bloqueado) e histórico de transações por conta,  
**Para que** eu possa monitorar meus fundos em tempo real, entender quanto posso sacar, verificar valores em processamento, e tomar decisões informadas sobre movimentação de fundos entre contas ou redes.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso **full** (read-only)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (mesmo que Admin/Ops)
  - Developer tem acesso **read-only** (visualizar contas para troubleshooting de API keys)
- **Read-only page:** Nenhuma ação de escrita (não pode criar/editar/deletar contas)
- **Two-column layout (desktop):**
  - **Left sidebar:** Lista de todas contas agrupadas por moeda (USDT, BTC, USDC, etc.)
    - Cada moeda mostra sub-contas por rede (TRX, SOL, ERC-20, Mainnet)
    - Mostra total balance (sum de available + locked + toReceive + blocked)
    - Selected account tem highlight (bg-accent + border-left primary)
  - **Right panel:** Detalhes da conta selecionada
    - Account header: Currency · Network + Internal Code
    - Balance breakdown: 4 cards (Available, Locked, To Receive, Blocked)
    - Recent transactions table: Date, Description, Debit, Credit, Resulting Balance
- **Mobile layout:** 
  - Dropdown selector no topo (substitui sidebar)
  - Mostra "Currency · Network" + Total balance
  - Right panel expande full-width
- **Multi-currency/multi-network architecture:**
  - Merchant pode ter múltiplas contas da MESMA moeda em REDES diferentes
  - Exemplo: USDT-TRX, USDT-SOL, USDT-ERC20 (3 contas separadas)
  - Cada conta tem seu próprio saldo e histórico independente
- **Balance breakdown (4 states):**
  1. **Available:** Pode ser sacado imediatamente
  2. **Locked:** Bloqueado temporariamente (ex: payment pending settlement, dispute em andamento)
  3. **To Receive:** A receber (ex: payments pending confirmação blockchain)
  4. **Blocked:** Bloqueado permanentemente (ex: compliance freeze, AML hold)
- **Total balance calculation:** `available + locked + toReceive + blocked`
- **Transactions table:** Últimas 10-20 movimentações desta conta específica
  - Formato: Date, Description, Debit (red), Credit (green), Resulting Balance
  - Se sem transações: Empty state "No recent transactions"
- **Responsive:** Cards em grid 2x2, mobile-friendly, monospace para valores

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Listar todas as contas** | `GET` | `/api/accounts/list` | `{}` | `{ "accounts": [{ "account_id": "acc_usdt_trx_001", "currency": "USDT", "network": "TRX", "internal_code": "ACC-USDT-TRX-001", "balances": { "available": "12480.90", "locked": "1200.00", "to_receive": "450.50", "blocked": "0.00", "total": "14131.40" }, "display_name": "USDT · TRX", "created_at": "2025-01-15T10:00:00Z", "status": "active" }, { "account_id": "acc_usdt_sol_002", "currency": "USDT", "network": "SOL", "internal_code": "ACC-USDT-SOL-002", "balances": { "available": "8320.45", "locked": "0.00", "to_receive": "120.00", "blocked": "0.00", "total": "8440.45" }, "display_name": "USDT · SOL", "created_at": "2025-01-20T14:30:00Z", "status": "active" }, { "account_id": "acc_btc_main_004", "currency": "BTC", "network": "Mainnet", "internal_code": "ACC-BTC-MAIN-004", "balances": { "available": "0.45892100", "locked": "0.00000000", "to_receive": "0.02340000", "blocked": "0.00000000", "total": "0.48232100" }, "display_name": "BTC · Mainnet", "created_at": "2025-02-01T08:00:00Z", "status": "active" }], "summary": { "total_accounts": 7, "active_accounts": 7, "currencies_count": 3, "networks_count": 5 } }` | **A** (Categoria A - Critical, real-time polling 10s) | Toast "Failed to load accounts" + Retry button + Empty state |
| **Obter detalhes de uma conta** | `GET` | `/api/accounts/details` | `{ "account_id": "acc_usdt_trx_001" }` | `{ "account_id": "acc_usdt_trx_001", "currency": "USDT", "network": "TRX", "internal_code": "ACC-USDT-TRX-001", "balances": { "available": "12480.90", "locked": "1200.00", "to_receive": "450.50", "blocked": "0.00", "total": "14131.40" }, "display_name": "USDT · TRX", "wallet_address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX", "created_at": "2025-01-15T10:00:00Z", "updated_at": "2025-12-22T14:32:00Z", "status": "active", "metadata": { "blockchain_confirmations_required": 12, "minimum_withdrawal": "10.00", "maximum_withdrawal": "50000.00", "daily_withdrawal_limit": "100000.00", "withdrawal_fee": "1.00" } }` | **A** (Categoria A - Real-time polling 10s) | Toast "Failed to load account details" + Show last cached data |
| **Obter transações de uma conta** | `GET` | `/api/accounts/transactions` | `{ "account_id": "acc_usdt_trx_001", "page": 1, "limit": 20, "sort_by": "date", "sort_order": "desc" }` | `{ "transactions": [{ "id": "tx1", "date": "2025-12-17T14:32:00Z", "description": "Payment received from merchant #3421", "debit": null, "credit": "1450.00", "resulting_balance": "12480.90", "transaction_type": "payment_in", "linked_payment_id": "tx_001", "status": "completed" }, { "id": "tx2", "date": "2025-12-17T11:20:00Z", "description": "Withdrawal to external wallet", "debit": "2500.00", "credit": null, "resulting_balance": "11030.90", "transaction_type": "withdrawal", "linked_withdrawal_id": "wth_123", "status": "completed" }], "pagination": { "current_page": 1, "total_pages": 2, "total_count": 35, "per_page": 20 } }` | **B** (Categoria B - Load once + soft refresh 30s) | Empty state "No recent transactions" (se sem data) ou toast "Failed to load transactions" |
| **Obter resumo agregado de saldos** | `GET` | `/api/accounts/summary` | `{}` | `{ "summary": { "total_value_usd": "87234.56", "by_currency": [{ "currency": "USDT", "total_accounts": 3, "total_balance": "26471.55", "equivalent_usd": "26471.55" }, { "currency": "BTC", "total_accounts": 1, "total_balance": "0.48232100", "equivalent_usd": "45890.23" }, { "currency": "USDC", "total_accounts": 2, "total_balance": "5130.50", "equivalent_usd": "5130.50" }], "breakdown_by_status": { "available": "74832.10", "locked": "3120.00", "to_receive": "1890.50", "blocked": "0.00" } }, "last_updated": "2025-12-22T14:32:00Z" }` | **A** (Categoria A - Real-time polling 10s) | Se falhar, não mostra summary card (não bloqueia lista de contas) |

**Notas sobre classificação de queries:**

- **List accounts (Categoria A):** Balances são dados CRÍTICOS que mudam em tempo real (incoming payments, withdrawals processing). Polling agressivo a cada 10 segundos enquanto página está visível.
  
- **Account details (Categoria A):** Mesma criticidade de list accounts. Quando merchant seleciona uma conta, detalhes devem estar sempre atualizados (available balance muda constantemente).

- **Account transactions (Categoria B):** Transações mudam menos frequentemente (apenas quando novo payment/withdrawal). Soft refresh 30s é suficiente. Tabela mostra snapshot histórico.

- **Summary (Categoria A):** Resumo agregado usado para overview rápido. Mesma criticidade de balances (merchant precisa saber "quanto tenho no total" em real-time).

**Importante:** Balances é uma das queries MAIS críticas do sistema. Merchant acessa essa página constantemente para verificar "quanto posso sacar?" antes de fazer withdrawal. Dados desatualizados podem causar frustração ou withdrawal failures.

**Balance states explicados:**
- **Available:** Valor que pode ser sacado AGORA (não locked, não blocked, não pending)
- **Locked:** Temporariamente bloqueado mas merchant ainda "possui" (vai liberar após settlement/dispute)
- **To Receive:** Payments pending confirmação (merchant já vendeu mas blockchain ainda confirmando)
- **Blocked:** Permanentemente bloqueado até ação manual (compliance, AML, disputes, chargebacks em investigação)

---

## Ações de escrita (commands)

**Nenhuma ação de escrita direta.** Balances é uma página 100% read-only (view-only).

**Nota:** Contas são criadas automaticamente pelo sistema quando:
1. Merchant ativa um novo template que usa nova moeda/rede
2. Merchant recebe primeiro payment em nova moeda
3. Crossramp Ops cria manualmente via admin panel (caso excepcional)

Merchant NÃO pode criar, editar ou deletar contas via Balances page.

**Ações indiretas que afetam balances:**
- **Receive payment** (via Dashboard ou Templates) → Aumenta `available` ou `to_receive`
- **Withdraw funds** (via Withdraw page) → Reduz `available`, temporariamente aumenta `locked` durante processing
- **Refund payment** (via Payments page) → Reduz `available`
- **Dispute resolution** (via Disputes page) → Move de `locked` para `available` ou `blocked`

**Futuras write actions potenciais:**
- **Transfer between accounts** - Mover fundos de USDT-TRX para USDT-SOL (cobrar gas fee)
- **Lock funds manually** - Merchant pode "reservar" fundos para future withdrawal (move available → locked)
- **Request account closure** - Merchant solicita fechar conta (se balance = 0)

Essas actions seriam implementadas em fase futura, atualmente não existem.

---

## Guia interno do produto

### Quando usar
Merchant/Ops acessa Balances quando:
1. **Check rápido:** "Quanto tenho disponível para sacar?"
2. **Pré-withdrawal:** Antes de ir para Withdraw page, verificar available balance
3. **Troubleshooting:** "Por que meu withdrawal falhou?" → Verificar se tinha available balance suficiente
4. **Reconciliação:** Comparar balances com pagamentos recebidos (cross-reference com Payments page)
5. **Multi-network strategy:** Decidir qual rede usar para withdrawal (comparar fees entre TRX, SOL, ERC-20)
6. **Dispute/Lock tracking:** Verificar quanto está locked (disputas em andamento)
7. **Pending monitoring:** Ver quanto está "to receive" (payments pending confirmação)
8. **Blocked investigation:** Se funds blocked, descobrir por quê (compliance issue?)

### Dependências
- **Payments:** Payments in aumentam balances (credit to account)
- **Withdrawals:** Withdrawals reduzem balances (debit from account)
- **Refunds:** Refunds reduzem balances (reverse credit)
- **Templates:** Cada template opera em uma conta específica (ex: template "fast_usdt_trx" → USDT-TRX account)
- **Blockchain confirmations:** "To receive" vira "available" após confirmações blockchain
- **Disputes:** Disputas movem fundos para "locked" até resolução
- **Compliance:** AML/KYC issues podem mover fundos para "blocked"

### Arquitetura multi-currency/multi-network

**Conceito fundamental:** Merchant pode ter MÚLTIPLAS contas da MESMA moeda em REDES diferentes.

**Por que?**
1. **Custos diferentes:** Gas fee ETH >> Gas fee TRX (merchant prefere TRX para withdrawals pequenos)
2. **Settlement speed:** SOL confirma em ~1s, ETH em ~15s, TRX em ~3s (merchant escolhe por urgência)
3. **Liquidity distribution:** Merchant distribui funds entre redes para redundância
4. **Customer preference:** Alguns customers só têm wallet SOL, outros só ETH

**Exemplo real:**
Merchant tem:
- **USDT-TRX:** R$ 12.480 (gas fee barato, rede rápida) → Preferido para payments pequenos
- **USDT-SOL:** R$ 8.320 (rede mais rápida, gas fee médio) → Preferido para urgências
- **USDT-ERC20:** R$ 5.670 (gas fee caro, mas maior liquidez) → Preferido para payments grandes

**Total USDT:** R$ 26.470 (distribuído entre 3 redes)

**Navegação:**
- Sidebar agrupa por moeda (USDT, BTC, USDC)
- Dentro de cada moeda, lista redes (TRX, SOL, ERC-20)
- Merchant clica em uma conta → Right panel mostra detalhes

### Balance breakdown (4 states)

#### 1. **Available (Disponível)**
**O que é:** Fundos que podem ser sacados IMEDIATAMENTE.

**Quando aumenta:**
- Payment in é confirmado (blockchain confirmations completas)
- Locked balance é liberado (dispute resolvido a favor do merchant)

**Quando diminui:**
- Merchant faz withdrawal
- Merchant processa refund
- Fee é cobrado (processing fee, network fee)

**Exemplo:**
- Merchant tem R$ 12.480 available
- Faz withdrawal de R$ 2.500
- Available agora: R$ 9.980 (12.480 - 2.500)

#### 2. **Locked (Bloqueado temporariamente)**
**O que é:** Fundos temporariamente indisponíveis mas ainda pertencem ao merchant.

**Quando aumenta:**
- Withdrawal está processing (fondos "reservados" até confirmação blockchain)
- Payment em dispute (customer abriu disputa)
- Chargeback em investigação

**Quando diminui:**
- Withdrawal completa (locked → withdrawn)
- Dispute resolvido a favor de merchant (locked → available)
- Dispute resolvido a favor de customer (locked → refunded, sai do balance)

**Exemplo:**
- Merchant tem R$ 1.200 locked
- R$ 800 é de dispute em andamento
- R$ 400 é withdrawal processing
- Quando dispute é resolvido (a favor): Locked vira R$ 400, Available aumenta R$ 800

**Timeline típica:** 1-7 dias (disputes demoram mais, withdrawals algumas horas)

#### 3. **To Receive (A receber)**
**O que é:** Fundos que merchant já "ganhou" mas ainda não confirmaram na blockchain.

**Quando aumenta:**
- Payment in é criado (customer pagou) mas ainda pending confirmações blockchain

**Quando diminui:**
- Blockchain confirmations completas (to_receive → available)
- Payment expira/falha (to_receive → zero, nada é creditado)

**Exemplo:**
- Customer paga R$ 450 via TRX
- Payment aparece com 2/12 confirmações
- Mostra em "To Receive": R$ 450
- Após 12 confirmações: To Receive vira zero, Available aumenta R$ 450

**Timeline típica:** 1-30 minutos (depende da rede: SOL ~1min, TRX ~3min, ETH ~15min)

**Importante:** Merchant NÃO pode sacar "to receive" (ainda não é dinheiro confirmado)

#### 4. **Blocked (Bloqueado permanentemente)**
**O que é:** Fundos permanentemente bloqueados até ação manual de Crossramp Ops/Compliance.

**Quando aumenta:**
- AML/KYC issue (compliance detectou atividade suspeita)
- Court order (ordem judicial para bloquear fundos)
- Multiple chargebacks (merchant tem muitos chargebacks, funds held)
- Fraud investigation (suspeita de fraude)

**Quando diminui:**
- Compliance libera após investigação (blocked → available)
- Funds são forfeit (seized, merchant perde permanentemente)
- Refund forçado para customers afetados (blocked → refunded)

**Exemplo:**
- Merchant tem R$ 0 blocked (normal)
- Compliance detecta payment suspeito de R$ 3.000
- Blocked vira R$ 3.000, Available reduz R$ 3.000
- Após investigação (merchant é inocente): Blocked vira zero, Available aumenta R$ 3.000

**Timeline típica:** 7-30 dias (investigações de compliance demoram)

**Critical:** Se blocked > 0, merchant deve contatar Crossramp Ops imediatamente (não libera sozinho)

### Campos principais explicados

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| **account_id** | ID único da conta | `acc_usdt_trx_001` |
| **currency** | Moeda da conta | `USDT`, `BTC`, `USDC`, `BRL` |
| **network** | Rede blockchain | `TRX`, `SOL`, `ERC-20`, `Mainnet` |
| **internal_code** | Código interno para referência | `ACC-USDT-TRX-001` |
| **balances.available** | Pode sacar agora | `12480.90` |
| **balances.locked** | Bloqueado temporariamente | `1200.00` |
| **balances.to_receive** | Aguardando confirmação blockchain | `450.50` |
| **balances.blocked** | Bloqueado permanentemente (compliance) | `0.00` |
| **balances.total** | Soma de todos (available + locked + to_receive + blocked) | `14131.40` |
| **display_name** | Nome para UI | "USDT · TRX" |
| **wallet_address** | Endereço da wallet desta conta | `TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX` |
| **status** | Estado da conta | `active`, `inactive`, `suspended` |

### Casos extremos

#### 1. Total balance não bate com sum de payments
**Cenário:** Merchant somou todos payments in, mas balance está menor.  
**Causa:** Balance exclui:
- Fees cobrados (processing fee, network fee)
- Refunds processados
- Withdrawals já feitos
- Funds locked em disputes

**Solução:** Ir para Statement page (mostra TODAS movimentações incluindo fees/refunds)

#### 2. Available balance = 0 mas to_receive > 0
**Cenário:** Merchant acabou de receber payment mas available ainda zero.  
**Explicar:** Payment está pending blockchain confirmations.  
**Timeline:** Aguardar 1-30 minutos (depende da rede).  
**Check:** Ver "To Receive" card (deve mostrar o valor pending).

**Red flag:** Se "to receive" não aumenta após 1h → Payment pode ter falhado (verificar em Payments page)

#### 3. Withdrawal falhou mas available > amount
**Cenário:** Merchant tem R$ 10k available, tenta sacar R$ 5k, withdrawal falha.  
**Causas possíveis:**
1. Whitelist check falhou (wallet destino não está whitelisted)
2. Daily withdrawal limit atingido (ex: max R$ 100k/dia)
3. Minimum withdrawal não atingido (ex: min R$ 10 por withdrawal)
4. Network issue (blockchain congestion)
5. Balance mudou entre check e execution (race condition)

**Solução:** Ver erro específico no toast/modal de withdrawal

#### 4. Multiple accounts mesma moeda/rede (raro)
**Cenário:** Merchant tem 2 contas USDT-TRX (por algum motivo técnico).  
**Tratamento:**
- Backend retorna ambas contas na lista
- Frontend mostra ambas com internal_code diferente (ACC-USDT-TRX-001, ACC-USDT-TRX-002)
- Merchant seleciona qual usar para withdrawal
- **Nota:** Isto é RARO, normalmente merchant tem 1 conta por currency+network

#### 5. Locked balance alto por muito tempo (>7 dias)
**Cenário:** Merchant tem R$ 5k locked há 10 dias.  
**Investigar:**
1. Ver Recent Transactions → Identificar qual transaction criou o lock
2. Ir para Disputes page → Ver se tem dispute aberto
3. Ir para Withdrawals page → Ver se withdrawal está stuck
4. Se nada óbvio → Contatar Crossramp Ops (pode ser bug)

**Timeline normal:** Locked deve resolver em 1-7 dias. Se >7 dias = anormal.

#### 6. Blocked balance apareceu de repente
**Cenário:** Merchant tinha R$ 0 blocked, de repente tem R$ 10k blocked.  
**Ação imediata:**
1. Merchant recebe email de Crossramp Compliance explicando motivo
2. Merchant deve responder email com documentação solicitada
3. NÃO tentar sacar outros fundos (pode piorar situação)
4. Aguardar resolução de compliance (7-30 dias)

**Motivos comuns:**
- Payment suspeito (valor muito alto, customer novo)
- KYC documents vencidos (precisa atualizar)
- Multiple chargebacks recentes (risk management)
- Ordem judicial (crime investigation)

#### 7. BTC balance com muitos decimais
**Cenário:** BTC mostra `0.45892100` (8 decimais).  
**Explicar:** BTC usa satoshis (1 BTC = 100,000,000 satoshis), sempre 8 decimals.  
**Formatação:** Backend deve retornar sempre 8 decimals para BTC (mesmo se 0.00000000).  
**Conversão para USD:** `0.45892100 BTC * $96,000/BTC = $44,056.42 USD` (para summary)

#### 8. Empty transactions table mas balance > 0
**Cenário:** Conta tem R$ 5k available mas "No recent transactions".  
**Causa:** Transações são antigas (>30 dias), tabela só mostra recent.  
**Solução:** Ir para Statement page (mostra histórico completo) ou Payments page.  
**Nota:** Balance pode ter vindo de:
- Transfer de outra conta (feature futura)
- Ajuste manual de Ops (correção de erro)
- Migração de sistema antigo (balance inicial)

### Notas para Ops/CS

#### Troubleshooting comum

**"Não consigo sacar, diz insufficient funds"**
- **Verificar:**
  1. Available balance é suficiente? (não confundir com Total)
  2. Locked + To Receive NÃO podem ser sacados
  3. Minimum withdrawal foi atingido? (ex: min R$ 10)
  4. Daily limit foi atingido? (ex: max R$ 100k/dia)
- **Solução:** Se available < valor desejado, aguardar release de locked funds ou novos payments

**"Meu balance não bateu com meus pagamentos"**
- **Explicar:** Balance = Payments - Fees - Refunds - Withdrawals
- **Exemplo:**
  - Payments in: R$ 50k
  - Fees: R$ 750 (1.5% processing)
  - Refunds: R$ 2k
  - Withdrawals: R$ 10k
  - Balance esperado: 50k - 750 - 2k - 10k = R$ 37.250
- **Solução:** Ir para Statement page (mostra breakdown completo)

**"Tenho fundos locked há muitos dias"**
- **Investigar:**
  1. Verificar Disputes page (pode ser dispute em andamento)
  2. Verificar Withdrawals page (pode ser withdrawal stuck)
  3. Se nenhum dos 2, contatar Ops (possível bug ou compliance hold)
- **Timeline normal:** Locked resolve em 1-7 dias, se >7 dias = anormal

**"O que significa to_receive?"**
- **Explicar:** Fundos que você vendeu mas blockchain ainda está confirmando
- **Exemplo:** Customer pagou via TRX, transação tem 5/12 confirmações
- **Timeline:** Aguardar 1-30 minutos (varia por rede)
- **Ação:** Nenhuma, é automático (to_receive → available após confirmações)

**"Fundos blocked, o que fazer?"**
- **Ação imediata:**
  1. Verificar email de Compliance (sempre enviam notificação)
  2. Responder com documentação solicitada
  3. NÃO fazer novos withdrawals até resolver
- **Timeline:** 7-30 dias (depende da complexidade da investigação)
- **Escalation:** Se >30 dias sem resposta, escalar para Senior Compliance

**"Tenho 3 contas USDT, qual usar para withdrawal?"**
- **Guia de decisão:**
  1. **Withdrawal pequeno (<R$ 1k):** USDT-TRX (gas fee mais barato)
  2. **Withdrawal urgente:** USDT-SOL (rede mais rápida)
  3. **Withdrawal grande (>R$ 10k):** USDT-ERC20 (mais seguro, maior liquidez)
- **Considerar:**
  - Gas fee atual (pode variar por network congestion)
  - Wallet destino (aceita qual rede?)
  - Disponibilidade (qual conta tem available balance?)

### Melhorias futuras

1. **Transfer between accounts:** Botão para mover fundos de USDT-TRX → USDT-SOL (cobrar gas fee)
2. **Balance chart:** Gráfico de linha mostrando evolução do balance ao longo do tempo
3. **Alerts/Notifications:** Email quando available balance < threshold (ex: < R$ 1k)
4. **Lock breakdown:** Expandir "locked" para mostrar o que está locked (R$ 800 dispute + R$ 400 withdrawal)
5. **To receive timeline:** Mostrar countdown "5/12 confirmations, ~8 minutes remaining"
6. **Blocked details:** Mostrar motivo do block inline (ao invés de só no email)
7. **Multi-account actions:** Selecionar múltiplas contas e ver total aggregado
8. **Export balances:** Botão "Export all accounts to CSV" (para reconciliação)
9. **Balance history:** Ver snapshot do balance em data específica (ex: "Balance em 31/Nov/2024")
10. **Currency conversion:** Mostrar equivalent em BRL ou USD ao lado de cada balance
11. **Quick withdraw:** Botão "Withdraw" no balance card (shortcut para Withdraw page com account pré-selecionado)
12. **Transaction pagination:** Carregar mais transactions (atualmente só últimas 10-20)
13. **Transaction filters:** Filtrar transactions por type (payments, withdrawals, refunds, fees)
14. **Real-time updates:** WebSocket push (ao invés de polling) para balances muito ativos
15. **Balance projection:** "Se você receber todos to_receive, available será R$ X"

### Best practices para compartilhar com merchants

1. **Check before withdraw:** Sempre verificar available balance ANTES de ir para Withdraw page
2. **Don't count locked:** Locked NÃO pode ser sacado (aguardar release)
3. **Understand to_receive:** To receive é "quase seu" mas aguardando confirmações (1-30min)
4. **Multi-network strategy:** Distribuir fundos entre redes para otimizar gas fees
5. **Monitor blocked:** Se blocked > 0, agir imediatamente (não aguardar)
6. **Daily limit awareness:** Saber seu daily withdrawal limit (evita surpresas)
7. **Minimum withdrawal:** Não tentar sacar valores abaixo do mínimo (vai falhar)
8. **Reconcile weekly:** Comparar balances com Statement weekly (catch discrepancies early)
9. **Use internal_code:** Anotar internal_code da conta ao reportar issues (ex: "ACC-USDT-TRX-001 está com problema")
10. **Recent transactions:** Verificar recent transactions para entender de onde vem balance

### Métricas importantes (para Crossramp Ops)

**Healthy merchant:**
- Available: 80-90% do total balance
- Locked: 5-10% (normal churn de disputes/withdrawals)
- To Receive: 0-5% (payments confirmando)
- Blocked: 0% (nada bloqueado)

**Warning signs:**
- Locked > 20% por >7 dias → Investigar disputes/withdrawals stuck
- To Receive > 30% → Blockchain confirmations lentas? Network issue?
- Blocked > 0% → Compliance issue, precisa ação manual
- Available = 0% mas Total > 0 → Merchant não consegue operar (tudo locked/blocked)

**Critical issue:**
- Blocked > 50% do total → Compliance hold grave
- To Receive > 50% por >1h → Blockchain problema sério
- Available < 0 (negativo) → BUG CRÍTICO (impossible, contactar dev team)
