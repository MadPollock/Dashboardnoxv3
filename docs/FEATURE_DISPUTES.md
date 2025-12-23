# Feature Documentation: Disputes

**Componente de View:** `/src/app/views/DisputesView.tsx`  
**Componentes de Modal:** `/src/app/components/admin/DisputeDetailsModal.tsx`  
**ID de Rota/Navegação:** `disputes`  
**API Contract:** `/docs/API_CONTRACT_DISPUTES.md` (⚠️ **Canonical source of truth for all endpoints**)

## História de usuário

**Como** administrador ou operador do Crossramp,  
**Eu quero** visualizar, filtrar e responder a disputas abertas por clientes sobre transações,  
**Para que** eu possa resolver problemas rapidamente (submeter defesas ou processar reembolsos), minimizar infrações de compliance, manter boa reputação com clientes, e evitar penalidades de score reputacional ou suspensão da conta.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso **full** (read + write)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (vê disputas mas não pode refund ou submit defense)
  - Developer não tem acesso (página não aparece na navegação)
- **Two-tier filtering system:**
  1. **Date range selector** - Filtrar disputas por período (default: últimos 30 dias)
  2. **Status filter pills** - All, Open, Under Review, Resolved, Closed (pill ativo com bg-foreground)
- **Quick Search** - Card no topo com input para buscar por Dispute ID, Payment ID ou Client Name
  - Busca abre modal de detalhes se encontrado
  - Mostra erro "Dispute not found" se não encontrado
- **Expandable general search** - Dentro do card de filters, search bar que expande on-click (para filtrar lista)
- **List view:** Cards horizontais com:
  - AlertCircle icon (red bg se infraction, gray se normal)
  - Client name + badges (status, refunded, infraction)
  - Dispute ID + Payment ID em subtitle
  - Amount + relative time ("2 hours ago", "Yesterday")
  - Dispute type (ex: "Goods not received")
  - Client reason preview (2 linhas com ellipsis)
  - Deadline warning se < 3 dias (Clock icon red + "2 days left to respond")
- **Modal de detalhes:** Full-screen modal (max-w-3xl) com:
  - Sticky header com dispute ID + status badges
  - Deadline warning banner (se urgente)
  - Overview grid (client name, amount, payment ID, dispute type, dates)
  - Client reason (card com bg-muted)
  - Merchant defense (card com bg-muted se existe, dashed border se vazio)
  - Infraction details (card com bg-destructive/10 se is_infraction=true)
  - Refund status banner (se is_refunded=true)
  - Footer sticky com action buttons
- **Write actions disponíveis no modal:**
  1. **Submit Defense** - Botão verde "write" variant (apenas se merchant_defense vazio)
  2. **Refund & Resolve** - Botão vermelho "destructive" → Abre RefundConfirmationModal → Abre MFAModal
  3. **Get Refund Receipt** - Download PDF do comprovante de refund (se já refunded)
- **Pagination:** 10 disputes per page, navegação com ChevronLeft/Right buttons
- **Request Report:** Botão no header para solicitar export PDF/CSV de disputes (abre RequestReportModal)
- **Responsive:** Mobile-friendly com cards stacking, relative dates adaptadas
- **Empty state:** Se nenhuma dispute no período: "No disputes found for selected filters. Try adjusting date range or filters."

## Ações de leitura (queries)

**⚠️ IMPORTANTE:** Para especificações técnicas completas (request/response schemas, error codes, validation rules), consultar `/docs/API_CONTRACT_DISPUTES.md`

| Ação | Método | Endpoint | Query Parameters | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|------------------|------------------------------|-----------|---------------------|
| **Listar disputas** | `GET` | `/api/disputes/list` | `?date_from=2025-11-22T00:00:00Z&date_to=2025-12-22T23:59:59Z&status=all&page=1&limit=10` | `{ "disputes": [{ "id": "dsp_001", "payment_id": "tx_001", "client_name": "João Silva", "client_reason": "I never received...", "dispute_type": "goods_not_received", "status": "open", "amount": "450.00", "currency": "BRL", "deadline": "2025-12-25T14:30:00Z" }], "pagination": { "current_page": 1, "total_pages": 3, "total_count": 27 } }` | **B** (Load once + refetch every 60s) | Toast "Failed to load disputes" + Retry button |
| **Buscar disputa por ID** | `GET` | `/api/disputes/search` | `?query=dsp_001` | `{ "found": true, "dispute": { "id": "dsp_001", "payment_id": "tx_001", "client_name": "João Silva" } }` OU `{ "found": false }` | **B** (On-demand search) | Toast "Dispute not found" |
| **Obter detalhes completos** | `GET` | `/api/disputes/details` | `?dispute_id=dsp_001` | `{ "id": "dsp_001", "transaction_details": {...}, "client_info": {...}, "timeline": [...] }` | **B** (Load on modal open) | Toast "Failed to load details" + fechar modal |
| **Baixar recibo de refund** | `GET` | `/api/disputes/refund-receipt` | `?refund_id=rfd_xxx&dispute_id=dsp_003` | PDF binary download: `refund_receipt_dsp_003.pdf` | **C** (On-demand download) | Toast "Failed to download receipt" |

**Notas sobre classificação de queries:**
- **List disputes (Categoria B):** Disputas mudam com frequência média (clientes abrem novas, merchant responde). Fetch inicial + soft refresh a cada 60s enquanto usuário está na página e não interagindo. Se usuário retorna ao tab, refetch imediatamente.
- **Search dispute (Categoria B):** Busca on-demand disparada pelo formulário Quick Search. Não precisa de polling.
- **Dispute details (Categoria B):** Carregado ao clicar em uma disputa (abrir modal). Não precisa de polling (usuário vê snapshot estático no modal).
- **Refund receipt (Categoria C):** Download on-demand de PDF. Não precisa de polling.

**Consideração futura:** Se volume de disputas crescer muito (>100/dia), considerar upgrade para Categoria A com websocket para real-time updates de status changes.

## Ações de escrita (commands)

**⚠️ IMPORTANTE:** 
1. Para especificações técnicas completas, consultar `/docs/API_CONTRACT_DISPUTES.md`
2. **MFA transita APENAS no JWT token** via `Authorization` header após `loginWithMFA()`. **NUNCA incluir `mfa_code` no payload.**

| Ação | Método | Endpoint | Formato de Payload (sem mfa_code) | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|-----------------------------------|-------------------|------------------|
| **Submeter defesa** | `POST` | `/api/commands/disputes/submitDefense` | `{ "dispute_id": "dsp_001", "defense_text": "Product was shipped on 2025-12-11 via FedEx. Tracking: BR123456789", "attachments": ["data:application/pdf;base64,..."] }` | Toast "Defense submitted successfully. Dispute status updated to 'Under Review'" + Fechar modal + Refetch | ✓ |
| **Refund e resolver** | `POST` | `/api/commands/disputes/refundAndResolve` | `{ "dispute_id": "dsp_001", "payment_id": "tx_001", "refund_amount": "450.00", "refund_reason": "Customer complaint resolved", "mark_as_resolved": true }` | Toast "Refund processed successfully. Dispute marked as resolved." + Fechar modal + Refetch | ✓ |
| **Contestar infração** | `POST` | `/api/commands/disputes/contestInfraction` | `{ "dispute_id": "dsp_007", "contest_reason": "We provided adequate evidence...", "supporting_evidence": ["data:image/png;base64,..."] }` | Toast "Infraction contest submitted. Review within 3 business days." + Fechar modal + Refetch | ✓ |

**Detalhes sobre "Submeter defesa":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `dispute_id` existe e pertence ao merchant
  - `defense_text` obrigatório, min 50 chars, max 2000 chars
  - `attachments` opcional, max 5 files, 10MB cada, formatos: PDF, JPG, PNG
  - Disputa deve estar em status `open` ou `under_review` (não pode submeter defesa em `resolved` ou `closed`)
  - `merchant_defense` ainda vazio (não pode resubmeter, apenas editar - TODO: considerar allow edit)
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Backend atualiza `merchant_defense` com texto
  - Status muda para `under_review` (se estava `open`)
  - Merchant recebe confirmação por email
  - Frontend refetch `/api/disputes/list`
  - Modal fecha
  - Toast de sucesso
- **Deadline extension:** Submeter defesa NÃO estende deadline. Deadline é fixo (7 dias desde abertura típico).
- **Refetch após sucesso:** Sim - Categoria B com debounce 500ms

**Detalhes sobre "Refund e resolver":**
- **Requer MFA:** Sim (double-confirm via RefundConfirmationModal + MFAModal)
- **Validações backend esperadas:**
  - `dispute_id` existe e pertence ao merchant
  - `payment_id` match com dispute.payment_id
  - `refund_amount` deve ser <= transaction amount original
  - Disputa NÃO pode já estar `is_refunded: true` (não pode refund twice)
  - Merchant deve ter saldo suficiente para processar refund
  - `refund_reason` obrigatório, max 500 chars
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Backend processa refund (credita valor de volta para customer)
  - Gera `refund_id` único
  - Atualiza dispute: `is_refunded: true`, `refund_id: "rfd_..."`, `status: "resolved"`
  - Se disputa tinha `is_infraction: true`, infração pode ser cancelada OU mantida (depende de policy)
  - Merchant recebe email de confirmação
  - Customer recebe refund + notificação
  - Frontend refetch `/api/disputes/list`
  - Modal fecha
- **Edge case - Refund parcial:**
  - Se `refund_amount < transaction_amount`, dispute status = `resolved` mas merchant pode receber infração minor
  - Frontend deve mostrar warning se refund_amount != transaction_amount
- **Refetch após sucesso:** Sim - Categoria B com debounce 500ms

**Detalhes sobre "Contestar infração":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `dispute_id` existe e `is_infraction: true`
  - `contest_reason` obrigatório, min 100 chars, max 2000 chars
  - `supporting_evidence` opcional, max 10 files, 10MB cada
  - Merchant pode contestar apenas 1x por infração (não pode resubmeter)
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Backend cria ticket de revisão para Crossramp compliance team
  - Infração entra em status `under_review`
  - Merchant recebe email: "Your infraction contest has been submitted. We'll review within 3 business days."
  - Frontend refetch `/api/disputes/list`
  - Modal fecha
- **Timeline de revisão:**
  - Compliance team tem 3 business days para revisar
  - Se contest aceito → infraction removida + score reputacional restaurado
  - Se contest rejeitado → infraction mantida + merchant notificado com explicação
- **Refetch após sucesso:** Sim - Categoria B

## Guia interno do produto

### Quando usar
Merchant acessa Disputes quando:
1. **Notificação recebida:** Email ou webhook notifica que customer abriu disputa
2. **Dashboard alert:** Banner de "X open disputes" no dashboard overview
3. **Urgência deadline:** Disputa tem deadline < 3 dias (red warning)
4. **Review infraction:** Merchant precisa contestar infraction que afetou score reputacional
5. **Auditoria mensal:** Ops team revisa disputas resolvidas para identificar padrões

### Dependências
- **Transactions/Payments:** Disputas sempre vinculadas a um `payment_id` específico
- **Refund system:** Botão "Refund & Resolve" depende de saldo suficiente na conta merchant
- **Score Reputacional:** Infrações afetam score (ver `/docs/FEATURE_REPUTATION.md`)
- **Auth0 + RBAC:** Apenas Admin e Operations podem submeter defesas ou refunds; Analyst pode apenas visualizar
- **MFA:** Todas write actions requerem step-up MFA

### Casos extremos

#### 1. Disputa após deadline expirado
**Cenário:** Merchant tenta submeter defesa mas deadline já passou (>7 dias desde abertura)  
**Tratamento:**
- Backend retorna 400 "Deadline expired. Cannot submit defense after deadline."
- Frontend mostra toast: "Deadline expired. This dispute has been auto-resolved in favor of the customer."
- Dispute status muda para `closed` automaticamente
- Merchant pode ter recebido infraction se não respondeu a tempo

#### 2. Refund sem saldo suficiente
**Cenário:** Merchant tenta refund de R$1.000 mas tem apenas R$200 de saldo disponível  
**Tratamento:**
- Backend valida saldo antes de processar
- Retorna 400 "Insufficient balance. You have R$200.00 available but R$1,000.00 is required for this refund."
- Frontend mostra toast: "Cannot process refund. Insufficient balance. Please add funds to your account."
- **Solução:** Merchant deve depositar fundos OU esperar receber pagamentos para ter saldo

#### 3. Duplicate dispute no mesmo payment_id
**Cenário:** Customer abre 2 disputas diferentes para a mesma transação (ex: "goods not received" + "not as described")  
**Tratamento:**
- Backend deve permitir (disputas são independentes)
- Mas marcar segunda disputa com flag `is_duplicate: true`
- Frontend mostra warning banner: "This payment has another open dispute (dsp_002). Resolve both to avoid complications."
- Merchant deve resolver ambas (pode fazer bulk refund)

#### 4. Infração de alta severidade (high severity)
**Cenário:** Disputa marca merchant com infraction_severity="high" (ex: venda de produto falsificado)  
**Tratamento:**
- **Impacto imediato:**
  - Score reputacional cai 15-30 pontos
  - Taxa de processamento aumenta 0.5-1%
  - Limites de saque podem ser reduzidos
  - Conta pode entrar em review (suspensão temporária)
- **Ações obrigatórias:**
  - Merchant DEVE submeter contest com evidências
  - Se contest rejeitado 3x → suspensão permanente possível
- **Frontend UX:**
  - Card de disputa com infraction high severity tem borda RED
  - Modal mostra banner CRITICAL: "High severity infraction. Your account is under review."
  - Botão "Contest Infraction" fica em destaque (variant="destructive")

#### 5. Cliente cancela disputa após merchant submeter defesa
**Cenário:** Merchant submete defesa forte, cliente percebe erro e cancela disputa  
**Tratamento:**
- Backend recebe webhook de cancelamento de disputa
- Dispute status muda para `closed` com `resolution: "customer_withdrew"`
- Infração (se havia) é removida automaticamente
- Merchant recebe email: "Good news! Customer withdrew dispute dsp_001."
- Frontend refetch mostra status `closed` com badge verde

#### 6. Refund parcial vs refund total
**Cenário:** Transaction foi R$500, merchant quer refund apenas R$300 (goodwill gesture)  
**Tratamento:**
- Frontend mostra campo `refund_amount` editável no RefundConfirmationModal (default = transaction amount)
- Se merchant alterar para < amount original, mostrar warning: "⚠️ Partial refund may still result in infraction."
- Backend permite partial refund mas pode:
  - Marcar infraction como `severity: low` (mesmo se não havia antes)
  - Dispute status = `resolved` mas customer pode reabrir disputa pelo valor restante
- **Best practice:** Sempre refund total para evitar complicações

#### 7. Disputa em moeda crypto vs BRL
**Cenário:** Payment foi em USDT (TRX), cliente quer refund. Como processar?  
**Tratamento:**
- **Opção 1 (preferred):** Refund na mesma moeda original (USDT TRX)
  - Merchant precisa ter USDT suficiente em treasury wallet
  - Backend debita USDT do saldo merchant e envia para customer wallet
- **Opção 2:** Refund equivalente em BRL (via conversão)
  - Backend calcula taxa de conversão atual
  - Merchant paga em BRL, Crossramp converte e envia USDT para customer
  - **Taxa de conversão:** Usar taxa da data original da transação (não taxa atual)
- **Edge case:** Se USDT valorizou 10% desde transação, quem assume diferença?
  - **Policy:** Merchant assume (sempre refund amount original em moeda original)

### Notas para Ops/CS

#### O que são Disputes?
Disputes são **contestações formais** que clientes abrem sobre transações quando acreditam que há um problema (produto não chegou, cobrado errado, fraude, etc.). É o equivalente a um "chargeback" em cartões de crédito, mas gerenciado internamente pelo Crossramp.

**Diferença entre Dispute e Refund:**
- **Refund:** Merchant inicia voluntariamente (ex: cliente pediu devolução)
- **Dispute:** Cliente inicia formalmente, alegando problema, requer investigação

#### Tipos de disputa (dispute_type)

| Tipo | Descrição | Gravidade Típica | Como Responder |
|------|-----------|------------------|----------------|
| **fraudulent_transaction** | Cliente diz que transação foi fraude (cartão roubado, não autorizou) | **ALTA** (quase sempre resulta em infraction) | Submeter proof de 3D Secure, IP logs, confirmação de email |
| **goods_not_received** | Produto não foi entregue | Média-Alta | Enviar tracking number, proof of delivery, comunicação com carrier |
| **service_not_rendered** | Serviço contratado não foi prestado | Média | Mostrar logs de serviço realizado, comunicação com cliente |
| **not_as_described** | Produto diferente do anunciado | Média | Comparar anúncio com produto enviado, fotos, especificações |
| **defective_or_damaged** | Produto chegou quebrado ou com defeito | Baixa-Média | Oferecer troca/reparo, mostrar inspeção pré-envio |
| **refund_not_processed** | Cliente devolveu mas refund não foi feito | Média | Proof de refund processado, extrato bancário, timeline |
| **duplicate_or_incorrect** | Cobrado 2x ou valor errado | Baixa (fácil de resolver) | Verificar logs, processar refund imediato da duplicata |
| **other** | Outras razões não categorizadas | Varia | Analisar caso a caso |

#### Status da disputa (dispute.status)

| Status | Significado | Ações Merchant | Prazo |
|--------|-------------|----------------|-------|
| **open** | Disputa aberta, aguardando merchant responder | Submeter defesa OU processar refund | 7 dias típico |
| **under_review** | Merchant submeteu defesa, Crossramp analisando | Aguardar decisão (nenhuma ação disponível) | 3-5 dias úteis |
| **resolved** | Disputa resolvida (refund processado ou defesa aceita) | Nenhuma ação (apenas view) | N/A |
| **closed** | Disputa encerrada (pode ser por timeout, customer withdrawal, etc.) | Nenhuma ação (apenas view) | N/A |

#### Infrações (is_infraction)

**O que é infraction?**
Infraction é uma **penalidade** aplicada ao merchant quando Crossramp compliance determina que houve falha do lado do merchant (ex: vendeu produto falsificado, não enviou produto, fraude).

**Severidade de infrações:**
- **Low (Baixa):** Warning - score reputacional cai 1-5 pontos, sem impacto em taxas
- **Medium (Média):** Advertência - score cai 5-10 pontos, taxa pode subir 0.2-0.5%
- **High (Alta):** Séria - score cai 15-30 pontos, taxa sobe 0.5-1%, conta em review, possível suspensão

**Como contestar infraction:**
1. Merchant clica botão "Contest Infraction" no modal de disputa
2. Escreve justificativa (min 100 chars) + anexa evidências (max 10 files)
3. Compliance team revisa em 3 business days
4. Se aceito → infraction removida + score restaurado
5. Se rejeitado → infraction mantida + merchant notificado

**Consequências de 3+ infrações high:**
- Suspensão temporária de conta (7-30 dias)
- Possível encerramento de conta (se fraud pattern)

#### Troubleshooting comum

**"Cliente abriu disputa mas já recebi o produto de volta"**
- **Motivo:** Cliente pode ter aberto disputa antes de enviar devolução
- **Solução:** 
  1. Processar refund imediato (botão "Refund & Resolve")
  2. Disputa fecha automaticamente após refund
  3. Não submeter defesa (é desnecessário se já resolveu)

**"Deadline passou e não consegui responder"**
- **Motivo:** Merchant não viu notificação ou esqueceu
- **Consequências:**
  - Disputa auto-resolvida em favor do cliente (status=closed)
  - Refund processado automaticamente (debitado de saldo merchant)
  - Possível infraction "Failure to respond to dispute"
- **Solução futura:** Habilitar notificações push/email/SMS para não perder deadlines

**"Quero refund mas não tenho saldo suficiente"**
- **Solução:**
  1. Depositar fundos na conta (via PIX ou crypto)
  2. Aguardar até receber pagamentos suficientes
  3. Se urgente: contatar Crossramp support para negociar parcelamento (caso a caso)

**"Cliente abriu disputa fraudulenta (quer produto grátis)"**
- **Motivo:** Cliente mal-intencionado tenta exploitar sistema
- **Solução:**
  1. Submeter defesa com máximo de evidências:
     - Proof of delivery assinado
     - Screenshots de comunicação com cliente
     - Fotos do produto antes de enviar
     - Tracking completo
  2. **NÃO** processar refund (esperar decisão do Crossramp)
  3. Se disputa resolvida em seu favor → cliente pode receber infraction

**"Infraction foi injusta, como contestar?"**
- **Passo a passo:**
  1. Abrir modal da disputa que causou infraction
  2. Rolar até seção "Infraction Details"
  3. Clicar botão "Contest Infraction"
  4. Escrever explicação detalhada (min 100 chars)
  5. Anexar evidências fortes (contratos, emails, proofs)
  6. Aguardar 3 business days para revisão
- **Dica:** Seja específico e profissional. Evitar emotividade ("isso é injusto!"). Focar em fatos e evidências.

**"Tenho 5 disputas abertas urgentes (deadline amanhã)"**
- **Solução rápida:**
  1. Filtrar por status "Open"
  2. Ordenar por deadline (disputas com deadline mais próximo no topo)
  3. Para cada disputa urgente:
     - Se erro do merchant → "Refund & Resolve" (fast resolution)
     - Se defesa forte → "Submit Defense" com evidências já preparadas
  4. Se não conseguir responder todas → Priorizar maior valor first
- **Dica:** Manter documentação organizada (tracking numbers, proofs) para resposta rápida

### Melhorias futuras

1. **Bulk actions:** Selecionar múltiplas disputas e "Refund All" ou "Submit Defense for All" (com mesmo texto)
2. **Templates de defesa:** Salvar defesas comuns (ex: "Shipment delayed due to carrier") para reuso
3. **Auto-defense:** IA sugere draft de defesa baseado em dispute_type e histórico merchant
4. **Dispute prevention:** Sistema alerta merchant ANTES de cliente abrir disputa (ex: "Customer tracking check failed, likely to dispute")
5. **Mediation chat:** Canal de chat direto merchant ↔ customer dentro do modal para resolver sem escalação
6. **Analytics dashboard:** Gráficos de "Dispute rate by product", "Most common dispute types", "Win rate on defenses"
7. **SLA timers:** Visual countdown no card mostrando tempo restante para responder (não apenas "3 days left")
8. **Dispute appeal:** Se merchant perdeu disputa, permitir 1x appeal com evidências adicionais
9. **Customer dispute history:** Mostrar se cliente é "serial disputer" (abriu 10+ disputas em outros merchants)

### Best practices para compartilhar com merchants

1. **Responder rápido:** Não esperar deadline chegar perto. Responder nas primeiras 24h aumenta win rate em 40%.
2. **Evidências > texto:** 1 foto de proof of delivery vale mais que 1000 palavras de explicação.
3. **Ser conciso:** Defesas longas (>1000 chars) não são lidas completamente. Ir direto ao ponto.
4. **Quando refund:** Se disputa é "defective_or_damaged" ou "duplicate_or_incorrect", processar refund imediato é melhor que defender (evita infraction).
5. **Quando defender:** Se disputa é "fraudulent_transaction" ou "goods_not_received" MAS você tem proof of delivery, sempre defender.
6. **Documentar tudo:** Manter logs de tracking, emails com cliente, fotos pré-envio. Facilita resposta rápida.
7. **Comunicação proativa:** Se produto vai atrasar, avisar cliente ANTES de abrir disputa (reduz 70% de disputes).
8. **Return policy clara:** Ter política de devolução transparente no site reduz disputes "not_as_described".
9. **Quality control:** Inspecionar produtos antes de enviar para evitar "defective_or_damaged".
10. **Fraud prevention:** Usar 3D Secure, verificar IP suspeito, confirmar email/telefone antes de enviar produto caro (evita "fraudulent_transaction").