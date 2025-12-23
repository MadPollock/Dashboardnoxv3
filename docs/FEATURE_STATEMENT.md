# Feature Documentation: Statement

**Componente de View:** `/src/app/views/StatementView.tsx`  
**Componente de Modal:** `/src/app/components/modals/StatementDetailsModal.tsx`  
**ID de Rota/Navegação:** `statement` (under Reports section)

## História de usuário

**Como** administrador ou analista financeiro do Crossramp,  
**Eu quero** visualizar um extrato completo de todas as movimentações financeiras (débitos e créditos) de todas minhas contas com saldo resultante e histórico detalhado,  
**Para que** eu possa reconciliar contas para auditoria, rastrear fluxo de caixa, validar que todas transações foram processadas corretamente, gerar relatórios contábeis mensais, e ter uma visão unificada de todas operações financeiras da minha empresa.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso **full** (read-only)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (mesmo que Admin/Ops)
  - Developer não tem acesso (página não aparece na navegação)
- **Read-only page:** Nenhuma ação de escrita (não pode editar ou deletar movimentações)
- **Quick Search** - Card no topo para buscar por Statement Transaction ID
  - Busca abre modal de detalhes se encontrado
  - Mostra erro "Transaction not found" se não encontrado
- **Date range selector** - Filtrar movimentações por período (default: últimos 30 dias)
- **Two-tier filter system:**
  1. **Direction filter pills** - All, Incoming (credit > debit), Outgoing (debit > credit)
  2. **Account dropdown** - Filtrar por conta específica (ex: "BRL Main Account", "USD Account", "USDC Account")
- **General search** - Expandable search bar (filtra lista visível por info/description)
- **List view:** Cards horizontais com:
  - Info/Description: "Payment received from Customer ABC - Invoice #12345"
  - Statement ID (monospace): `stmt_001`
  - Account: "BRL Main Account"
  - Relative time: "2 hours ago", "Yesterday", "3 days ago"
  - Net amount (right-aligned): "+15,000.00 BRL" (green se credit) ou "-2,500.00 BRL" (red se debit)
  - Resulting balance (subtitle): "Balance: 65,000.00 BRL"
- **Modal de detalhes:** Full details de uma movimentação específica:
  - **Transaction ID** (monospace)
  - **Date** - Full timestamp (Dec 16, 2024, 10:30)
  - **Amount** - Net amount (credit - debit) em card destacado
  - **Debit & Credit** - Grid 2 colunas mostrando valores separados
  - **Balances** - Balance before + Resulting balance (após transação)
  - **Currency** - BRL, USD, USDC, etc.
  - **Info** - Full description da movimentação
  - **Account** - Qual conta foi afetada
- **Pagination:** 10 entries per page, Previous/Next buttons
- **Request Report:** Botão no header para solicitar export PDF/CSV (abre RequestReportModal)
- **Responsive:** Mobile-friendly com amounts alinhados direita, cards stacking
- **Color coding:** 
  - Incoming (credit > debit): Green text (+15,000.00)
  - Outgoing (debit > credit): Red text (-2,500.00)
  - Neutral (credit = debit): Gray text

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter extrato de movimentações** | `GET` | `/api/statement/list` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "direction": "all", "account": "all", "page": 1, "limit": 10, "sort_by": "date", "sort_order": "desc" }` | `{ "entries": [{ "id": "stmt_001", "date": "2025-12-16T12:30:00Z", "debit": 0, "credit": 15000.00, "balance_before": 50000.00, "resulting_balance": 65000.00, "currency": "BRL", "info": "Payment received from Customer ABC - Invoice #12345", "account": "BRL Main Account", "account_id": "acc_brl_001", "linked_transaction_id": "tx_001", "linked_transaction_type": "payment_in", "category": "payment_received", "reconciliation_status": "reconciled", "created_at": "2025-12-16T12:30:00Z" }], "summary": { "total_debits": 8400.00, "total_credits": 71450.00, "net_change": 63050.00, "starting_balance": 0, "ending_balance": 63050.00, "currency": "BRL" }, "pagination": { "current_page": 1, "total_pages": 2, "total_count": 12, "per_page": 10 } }` | **B** (Categoria B - Load once + soft refresh 60s) | Toast "Failed to load statement" + empty state com Retry button |
| **Buscar movimentação por ID** | `GET` | `/api/statement/search` | `{ "query": "stmt_001" }` | `{ "found": true, "entry": { "id": "stmt_001", "date": "2025-12-16T12:30:00Z", ... } }` OU `{ "found": false }` | **B** (Categoria B - On-demand search) | Toast "Transaction not found" (se found=false) ou "Search failed" |
| **Obter lista de contas** | `GET` | `/api/statement/accounts` | `{}` | `{ "accounts": [{ "account_id": "acc_brl_001", "account_name": "BRL Main Account", "currency": "BRL", "current_balance": 65000.00, "account_type": "main" }, { "account_id": "acc_usd_001", "account_name": "USD Account", "currency": "USD", "current_balance": 12500.00, "account_type": "secondary" }, { "account_id": "acc_usdc_001", "account_name": "USDC Account", "currency": "USDC", "current_balance": 8700.00, "account_type": "crypto" }] }` | **C** (Categoria C - Load once on page mount) | Se falhar, dropdown de account mostra apenas "All Accounts" |
| **Obter resumo do período** | `GET` | `/api/statement/summary` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "account": "all" }` | `{ "period": { "from": "2025-11-22T00:00:00Z", "to": "2025-12-22T23:59:59Z" }, "summary": { "total_debits": 8400.00, "total_credits": 71450.00, "net_change": 63050.00, "starting_balance": 0, "ending_balance": 63050.00, "currency": "BRL" }, "breakdown_by_account": [{ "account_id": "acc_brl_001", "account_name": "BRL Main Account", "debits": 5400.00, "credits": 60000.00, "net": 54600.00 }, { "account_id": "acc_usd_001", "account_name": "USD Account", "debits": 3000.00, "credits": 11450.00, "net": 8450.00 }], "breakdown_by_category": [{ "category": "payment_received", "total": 58000.00 }, { "category": "withdrawal", "total": -7500.00 }, { "category": "fee", "total": -900.00 }] }` | **B** (Categoria B - Load on demand, para mostrar card de summary) | Se falhar, não mostra card de summary (não bloqueia lista) |

**Notas sobre classificação de queries:**

- **List statement (Categoria B):** Movimentações mudam com frequência moderada (novos pagamentos, withdrawals, fees). Fetch inicial + soft refresh 60s enquanto página visível. Refetch imediato ao retornar ao tab.
  
- **Search statement (Categoria B):** Busca on-demand disparada pelo Quick Search form. Não precisa de polling.

- **Get accounts (Categoria C):** Lista de contas é relativamente estática (merchant raramente adiciona/remove contas). Carregar uma vez ao montar página. Refetch apenas após write actions em outras páginas (ex: criar nova conta).

- **Get summary (Categoria B):** Resumo do período é útil para mostrar em card no topo (total debits, total credits, net change). Carregar junto com lista. Refetch quando date range muda.

**Search capabilities:**
A busca por ID (`/api/statement/search`) deve procurar apenas por `id` (Statement Transaction ID como `stmt_001`). Para buscas mais complexas (por description, account, etc.), usar general search que filtra a lista client-side.

**Account filtering:**
Backend deve retornar apenas movimentações da(s) conta(s) selecionada(s). Se `account: "all"`, retornar todas contas agregadas. Se `account: "acc_brl_001"`, filtrar apenas BRL Main Account.

**Direction filtering:**
- `direction: "all"` → Retornar todas movimentações
- `direction: "incoming"` → Filtrar apenas onde `credit > debit` (net amount positivo)
- `direction: "outgoing"` → Filtrar apenas onde `debit > credit` (net amount negativo)

---

## Ações de escrita (commands)

**Nenhuma ação de escrita.** Statement é uma página 100% read-only (audit trail).

**Nota:** Statement entries são criadas automaticamente pelo sistema quando outras ações ocorrem (payments, withdrawals, refunds, fees). Merchant não pode criar, editar ou deletar statement entries manualmente.

**Futuras write actions potenciais:**
- **Adicionar nota a uma entry** - Merchant pode adicionar comentário explicativo (ex: "This fee was disputed and refunded")
- **Marcar como reconciliada** - Merchant marca entry como reconciliada com sistema contábil externo
- **Categorizar manualmente** - Merchant pode recategorizar uma entry (ex: de "other" para "payment_received")

Essas actions seriam implementadas em fase futura, atualmente não existem.

---

## Guia interno do produto

### Quando usar
Merchant/Ops acessa Statement quando:
1. **Reconciliação mensal:** Fechar mês contábil e validar que saldo bate com livro-caixa
2. **Auditoria:** Auditor externo solicita extrato completo de movimentações
3. **Troubleshooting de saldo:** "Por que meu saldo está diferente do esperado?" → revisar todas entries
4. **Análise de fluxo de caixa:** Entender entradas vs saídas ao longo do tempo
5. **Validação de fees:** Verificar quais fees foram cobrados e por quê
6. **Export para contabilidade:** Baixar CSV de todas movimentações para importar no software contábil
7. **Rastreamento de transação específica:** Buscar statement entry vinculada a um payment ou withdrawal

### Dependências
- **Payments:** Cada payment gera statement entry (credit para payment in, debit para payment out)
- **Withdrawals:** Cada withdrawal gera statement entry (debit)
- **Refunds:** Cada refund gera statement entry (debit)
- **Fees:** System fees (processing, network, monthly) geram statement entries (debit)
- **Balances:** Statement entries atualizam saldo das contas em tempo real
- **Accounts system:** Merchant pode ter múltiplas contas (BRL, USD, USDC, etc.) - statement mostra todas

### Diferença: Statement vs Payments vs Balances

Merchant frequentemente confunde estas 3 páginas. Aqui está a distinção:

| Feature | **Statement** | **Payments** | **Balances** |
|---------|--------------|--------------|--------------|
| **O que mostra** | Todas movimentações financeiras (débitos + créditos) | Apenas pagamentos/transações (in + out) | Saldo atual de cada conta |
| **Inclui fees?** | ✅ Sim (fees são entries separadas) | ❌ Não (fees são campo do payment) | ✅ Sim (fees afetam saldo) |
| **Inclui withdrawals?** | ✅ Sim (como debit entries) | ✅ Sim (como "sent" payments) | ✅ Sim (withdrawals reduzem saldo) |
| **Inclui refunds?** | ✅ Sim (como debit entries) | ✅ Sim (vinculado ao payment original) | ✅ Sim (refunds reduzem saldo) |
| **Mostra saldo?** | ✅ Sim (balance before + resulting balance) | ❌ Não | ✅ Sim (saldo atual) |
| **Formato** | Extrato bancário (double-entry ledger) | Lista de transações | Grid de cards por moeda |
| **Uso principal** | Reconciliação contábil | Rastreamento de pagamentos | Check rápido de saldo disponível |
| **Export** | CSV para software contábil | CSV para análise de vendas | Não exportável (apenas visualização) |

**Exemplo prático:**

**Payment in de R$ 1.000 (fee R$ 15):**
- **Payments page:** Mostra 1 payment (tx_001, amount: R$ 1.000, fee: R$ 15)
- **Statement page:** Mostra 2 entries:
  - Entry 1: +R$ 1.000 (credit - "Payment received from Customer")
  - Entry 2: -R$ 15 (debit - "Transaction fee - Payment processing")
- **Balances page:** Saldo BRL aumenta R$ 985 (1000 - 15)

### Campos principais explicados

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| **id** | Statement Transaction ID único | `stmt_001` |
| **date** | Data/hora da movimentação | `2025-12-16T12:30:00Z` |
| **debit** | Valor saindo da conta (negativo) | `2500.00` |
| **credit** | Valor entrando na conta (positivo) | `15000.00` |
| **balance_before** | Saldo antes desta movimentação | `50000.00` |
| **resulting_balance** | Saldo após esta movimentação | `65000.00` (se credit) ou `47500.00` (se debit) |
| **currency** | Moeda da conta | `BRL`, `USD`, `USDC` |
| **info** | Descrição da movimentação | "Payment received from Customer ABC - Invoice #12345" |
| **account** | Conta afetada | "BRL Main Account" |
| **account_id** | ID da conta | `acc_brl_001` |
| **linked_transaction_id** | Link para payment/withdrawal que gerou esta entry | `tx_001` (opcional, pode ser null para fees) |
| **linked_transaction_type** | Tipo da transação vinculada | `payment_in`, `payment_out`, `withdrawal`, `refund`, `fee` |
| **category** | Categoria da movimentação | `payment_received`, `withdrawal`, `fee`, `refund`, `adjustment` |
| **reconciliation_status** | Status de reconciliação | `pending`, `reconciled`, `disputed` |

**Cálculos importantes:**
- **Net amount** = `credit - debit` (positivo = incoming, negativo = outgoing)
- **Resulting balance** = `balance_before + credit - debit`
- **Total net change** = `sum(credit) - sum(debit)` (para período)

### Tipos de movimentação (category)

| Category | Debit | Credit | Descrição | Linked Type |
|----------|-------|--------|-----------|-------------|
| **payment_received** | 0 | ✓ | Payment in recebido de customer | `payment_in` |
| **payment_sent** | ✓ | 0 | Payment out enviado (raro) | `payment_out` |
| **withdrawal** | ✓ | 0 | Merchant sacou fundos para banco/wallet | `withdrawal` |
| **refund_issued** | ✓ | 0 | Merchant processou refund para customer | `refund` |
| **refund_received** | 0 | ✓ | Merchant recebeu refund de parceiro/provider | `refund` |
| **fee_processing** | ✓ | 0 | Taxa de processamento de payment | `fee` |
| **fee_network** | ✓ | 0 | Taxa de rede blockchain (gas fee) | `fee` |
| **fee_monthly** | ✓ | 0 | Taxa mensal de serviço | `fee` |
| **adjustment_credit** | 0 | ✓ | Ajuste manual de crédito (Crossramp Ops) | null |
| **adjustment_debit** | ✓ | 0 | Ajuste manual de débito (Crossramp Ops) | null |
| **conversion** | ✓ | ✓ | Conversão entre moedas (debit em uma, credit em outra) | `conversion` |
| **split_payment** | ✓ | 0 | Split de payment para parceiro (revenue share) | `payment_in` |

### Casos extremos

#### 1. Saldo negativo (overdraft)
**Cenário:** Merchant solicita withdrawal maior que saldo disponível, mas Crossramp processa (overdraft temporário).  
**Tratamento:**
- Backend permite `resulting_balance` negativo em casos excepcionais
- Entry aparece normal na lista mas `resulting_balance` é negativo (ex: -1500.00 BRL)
- Frontend mostra badge "Overdraft" em vermelho ao lado do saldo
- **Próxima entry de credit:** Saldo volta para positivo
- **Nota:** Overdraft só permitido para merchants com acordo especial (high-trust)

#### 2. Múltiplas contas na mesma moeda
**Cenário:** Merchant tem "BRL Main Account" + "BRL Savings Account".  
**Tratamento:**
- Backend retorna entries de AMBAS contas quando filter = "all"
- Frontend mostra `account` field claramente (ex: "BRL Main Account" vs "BRL Savings Account")
- Ao filtrar por `account: "acc_brl_001"`, mostra apenas entries da Main Account
- **Confusion point:** Merchant pode perguntar "por que tenho 2 saldos BRL diferentes?" → Explicar que são contas separadas

#### 3. Conversion entry (uma transação gera 2 entries)
**Cenário:** Merchant converte R$ 5.000 BRL → 1.000 USDT.  
**Tratamento:**
- Backend cria 2 statement entries:
  - Entry 1: Debit R$ 5.000 (BRL Main Account) - "Conversion to USDT"
  - Entry 2: Credit 1.000 USDT (USDC Account) - "Conversion from BRL"
- Ambas entries têm mesmo `linked_transaction_id` (ex: `conv_001`)
- Frontend mostra ambas na lista mas pode agrupar visualmente com badge "Conversion"

#### 4. Statement entry sem linked_transaction_id
**Cenário:** Entry de fee mensal ou ajuste manual.  
**Tratamento:**
- `linked_transaction_id: null`
- `linked_transaction_type: "fee"` ou `"adjustment"`
- Frontend não mostra link "View payment" (porque não há payment vinculado)
- **Info field** contém descrição suficiente (ex: "Monthly service fee - December 2025")

#### 5. Ordem de entries com mesmo timestamp
**Cenário:** Payment R$ 1.000 processado às 12:30:00 + Fee R$ 15 também às 12:30:00.  
**Tratamento:**
- Backend garante ordem correta usando `sequence_number` ou microseconds
- Entry de credit (payment) SEMPRE vem ANTES de entry de debit (fee)
- Isso garante que `balance_before` está correto na fee entry (já inclui o payment)
- **Exemplo:**
  - 12:30:00.000 - Entry 1: +R$ 1.000 (balance: 50k → 51k)
  - 12:30:00.001 - Entry 2: -R$ 15 (balance: 51k → 50.985k)

#### 6. Reconciliation status mismatch
**Cenário:** Merchant marca entry como `reconciled` mas depois disputa o valor.  
**Tratamento (futuro):**
- Merchant pode mudar status de `reconciled` → `disputed`
- Entry fica destacada com badge amarelo "Disputed"
- Ops team investiga e pode criar `adjustment` entry se necessário
- **Atualmente:** Reconciliation status é apenas informativo (não afeta saldo)

#### 7. Period spanning multiple currencies
**Cenário:** Merchant filtra "all accounts", tem BRL + USD + USDC. Como mostrar total?  
**Tratamento:**
- Frontend mostra entries de TODAS moedas misturadas na lista
- **Summary card:** Mostra breakdown por moeda separado:
  ```
  BRL: +R$ 63.050 (71k credits - 8k debits)
  USD: +$2.450 (3k credits - 550 debits)
  USDC: +1.200 USDC (1.5k credits - 300 debits)
  ```
- **Não tentar converter tudo para BRL** (taxa de conversão muda, seria impreciso)

#### 8. Missing balance_before (primeira entry da conta)
**Cenário:** Conta nova, primeira entry não tem `balance_before`.  
**Tratamento:**
- Backend assume `balance_before: 0` para primeira entry
- Entry mostra: Balance before: 0 → Resulting balance: 15.000 (se credit de 15k)

### Notas para Ops/CS

#### Troubleshooting comum

**"Meu saldo na Statement não bate com Balances page"**
- **Causa provável:** Date range selecionado não inclui todas movimentações até agora
- **Solução:**
  1. Verificar date range selecionado na Statement page
  2. Selecionar "All time" ou data até hoje
  3. Resulting balance da ÚLTIMA entry deve bater com current balance na Balances page
- **Edge case:** Se ainda não bater, pode ter entries pending (não apareceram ainda)

**"Não consigo encontrar uma transação no Statement"**
- **Investigar:**
  1. Verificar se transaction já foi "settled" (apenas settled transactions geram statement entries)
  2. Payments pending ainda não aparecem no Statement
  3. Verificar se está filtrando por account correto (ex: procurando em BRL mas transaction foi USDT)
- **Solução:** Ir para Payments page → filtrar por transaction ID → ver status (se pending, aguardar settlement)

**"Apareceu uma entry que eu não reconheço"**
- **Causas comuns:**
  1. Fee automático (processing, network, monthly)
  2. Refund processado via Disputes page (merchant esqueceu)
  3. Adjustment manual de Crossramp Ops (verificar email de notificação)
- **Solução:**
  1. Clicar na entry → abrir modal de detalhes
  2. Ver `category` e `info` fields
  3. Se ainda unclear, verificar `linked_transaction_id` (ir para Payments page buscar este ID)

**"Entry de fee está duplicada"**
- **Não é duplicata:** Payment in gera fee de processing (debit) + payment itself (credit) = 2 entries
- **Explicar:** Statement é double-entry ledger, cada movement tem 2 lados
- **Exemplo:** Payment de R$ 1.000 com fee 1.5%:
  - Entry 1: +R$ 1.000 (credit - payment received)
  - Entry 2: -R$ 15 (debit - processing fee)
  - Net effect: +R$ 985 (merchant recebe 985 líquido)

**"Quero deletar uma entry errada"**
- **Policy:** Statement entries NÃO podem ser deletadas (audit trail)
- **Solução para erro:**
  1. Crossramp Ops cria `adjustment` entry que inverte o erro
  2. Exemplo: Entry errada foi +R$ 1.000 → Criar adjustment de -R$ 1.000
  3. Net effect: zero (erro corrigido)
- **Explicação:** Isto mantém audit trail completo (quem criou, quando, por que foi corrigido)

**"Saldo está negativo, é possível?"**
- **Normalmente não:** Sistema bloqueia withdrawals se saldo insuficiente
- **Exceções:**
  1. Merchant tem overdraft permitido (acordo especial)
  2. Refund processado em dispute resultou em overdraft temporário
  3. Fee cobrado mas merchant não tinha saldo (Crossramp permite e cobra depois)
- **Solução:** Merchant deve depositar fundos para voltar a positivo

### Melhorias futuras

1. **Interactive balance graph:** Gráfico de linha mostrando evolução do saldo ao longo do período selecionado
2. **Category breakdown chart:** Pie chart mostrando % de cada category (payments, withdrawals, fees)
3. **Export multi-format:** PDF (além de CSV), OFX (import direto em QuickBooks/Xero)
4. **Reconciliation tools:** Checkbox para marcar entries como reconciliadas, bulk mark as reconciled
5. **Notes/Comments:** Merchant pode adicionar nota a cada entry (ex: "This was for Project X")
6. **Linked transaction preview:** Hover sobre entry → tooltip mostra preview do payment vinculado
7. **Filters advanced:** Multi-select categories, range de valores (ex: entries > R$ 10k)
8. **Email digest:** Merchant recebe email diário com summary (total credits, total debits, net change)
9. **Comparison view:** Comparar Statement de 2 períodos lado a lado (ex: Dezembro vs Novembro)
10. **Anomaly detection:** Sistema alerta quando entry é "unusual" (ex: fee 10x maior que normal)

### Best practices para compartilhar com merchants

1. **Reconcile monthly:** Comparar Statement export com extrato bancário todo final de mês
2. **Use date ranges wisely:** Selecionar períodos fechados (ex: 1-31 Dec) para reconciliação limpa
3. **Check resulting balance:** Última entry do Statement deve sempre bater com current balance na Balances page
4. **Filter by account:** Se tem múltiplas contas, reconciliar cada uma separadamente (não misturar)
5. **Understand fees:** Fees aparecem como entries separadas (debit), não confundir com duplicatas
6. **Link to payments:** Usar `linked_transaction_id` para rastrear statement entry → payment original
7. **Export for accounting:** Baixar CSV mensal e importar no software contábil (QuickBooks, Xero, Conta Azul)
8. **Don't expect instant:** Statement entries aparecem após settlement (pode levar 1-24h após payment)
9. **Multi-currency awareness:** Se opera multi-moeda, summary será separado por currency (não converter tudo)
10. **Save exports:** Manter CSV exports históricos (bom para auditorias futuras, tax compliance)

### Compliance notes

**IMPORTANTE para contadores/auditores:**

- **Statement é audit trail imutável:** Entries não podem ser editadas ou deletadas
- **Double-entry compliance:** Cada movimento tem debit/credit correspondente (mesmo que em accounts diferentes)
- **Timestamp accuracy:** Todas entries têm timestamp UTC preciso (até microseconds se necessário)
- **Reconciliation ready:** Format compatível com softwares contábeis brasileiros (Conta Azul, Omie) e internacionais (QuickBooks, Xero)
- **Tax reporting:** Export CSV pode ser usado diretamente para declaração de IR (IRPJ, CSLL)
- **Retention:** Crossramp mantém Statement data por 7 anos (compliance com legislação brasileira)
