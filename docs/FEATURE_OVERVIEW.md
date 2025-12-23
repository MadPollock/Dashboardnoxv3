# Feature Documentation: Overview (Dashboard)

**Componente de View:** `/src/app/views/DashboardView.tsx`  
**ID de Rota/Navegação:** `dashboard`  
**Status:** ✅ **IMPLEMENTADO** - UI completa + Queries integradas + Mock data funcional

## Estado Atual da Implementação (Dezembro 2024)

### ✅ Implementado
- ✅ Componente DashboardView com design mobile-first
- ✅ Hierarquia visual baseada em espaçamento (wabi-sabi)
- ✅ Saldo como hero element (32px Manrope)
- ✅ Dois CTAs principais: "Receive payment" e "Withdraw"
- ✅ Três cards informativos: Today, Recent Activity, Payment Status
- ✅ Navegação contextual: "View details" → Analytics, "View all" → Statement
- ✅ Restrição de role: botões de ação visíveis para Admin + Operations
- ✅ Modal ReceivePaymentModal integrado
- ✅ Strings multi-idioma via useStrings()
- ✅ **Queries de API implementadas em `/src/app/lib/queries.ts`:**
  - ✅ `queryAvailableBalance()` - GET `/api/balance/available`
  - ✅ `queryDashboardToday()` - GET `/api/dashboard/today`
  - ✅ `queryRecentTransactions()` - GET `/api/transactions/recent?limit=3`
  - ✅ `queryPaymentStatus()` - GET `/api/dashboard/payment-status?date=YYYY-MM-DD`
- ✅ **Integração com useQuery hook:**
  - ✅ Loading states (skeleton loaders)
  - ✅ Error states (error messages)
  - ✅ Categoria A: Manual refresh para balance (botão RefreshCw)
  - ✅ Categoria B: Auto-polling 60s para Today/Transactions/Status
- ✅ **Formatação de dados:**
  - ✅ Currency formatting (Intl.NumberFormat para BRL)
  - ✅ Relative time (date-fns formatDistanceToNow)
  - ✅ Percentages para Payment Status bars
- ✅ **Empty states:**
  - ✅ "No recent transactions" + motivational message
  - ✅ "No payments yet" para status card

### ✅ Modo Mock Ativo
- **Mock data generators** em queries.ts fornecem dados realistas
- Todos os endpoints funcionam em modo mock (configurável via `/public/config.js`)
- Delays de rede simulados (200-300ms) para UX realista
- Timestamps dinâmicos (ex: "2 min ago", "10 min ago")

### ⚠️ Estado de Produção

| Componente | Status | Próximo Passo |
|------------|--------|---------------|
| **Frontend** | ✅ Completo | Pronto para produção |
| **Backend Bastion** | ⚠️ Pendente | Implementar adaptadores para `/api/balance/available`, `/api/dashboard/today`, `/api/transactions/recent`, `/api/dashboard/payment-status` |
| **Modo Mock** | ✅ Ativo | Desabilitar em produção via `config.js` |

## História de usuário

**Como** comerciante usando o Crossramp,  
**Eu quero** ver um resumo consolidado do meu saldo atual, atividade de hoje e transações recentes em um único lugar,  
**Para que** eu possa rapidamente entender a saúde financeira do meu negócio e tomar ações imediatas como receber um novo pagamento ou solicitar um saque sem navegar por múltiplas telas.

## Notas de UX

- **Mobile-first design:** Interface limpa com hierarquia baseada em espaçamento, sem bordas duras ou elementos visuais desnecessários
- **Saldo como hero:** Valor do saldo disponível é o primeiro elemento visual, exibido em fonte grande (32px Manrope) com metadata secundária (moeda de settlement, timestamp)
- **CTAs primárias:** Dois botões de ação principais ("Receive payment" e "Withdraw") logo abaixo do saldo, acessíveis em um toque/click
- **Cards informativos:** Três cards principais exibem: (1) Today snapshot (pagamentos recebidos, pendentes, taxas), (2) Recent activity (últimas 3 transações), (3) Payments Today (status breakdown com barras de progresso)
- **Navegação contextual:** Links "View details" e "View all" direcionam usuário para views relacionadas (Analytics com filtro de hoje, Statement page)
- **Divulgação progressiva:** Apenas informação essencial é exibida; detalhes completos ficam em páginas dedicadas
- **Desktop responsive:** Em telas maiores, cards se reorganizam em grid mantendo hierarquia visual
- **Accessibility:** Metadados têm contrast sufficient, botões têm áreas de toque adequadas (min 44px), labels descritivos

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter saldo disponível** | `GET` | `/api/balance/available` | Nenhum | `{ "amount": 12480.90, "currency": "BRL", "settles_in": "USDT", "updated_at": "2024-12-22T14:32:00Z" }` | **A** (Categoria A - Refresh manual + on tab focus) | Exibir valor em cache com indicador "stale" se API falhar; permitir refresh manual |
| **Obter snapshot de hoje** | `GET` | `/api/dashboard/today` | Nenhum | `{ "payments_received": { "amount": 3240.00, "currency": "BRL" }, "payments_pending": { "amount": 580.00, "currency": "BRL" }, "fees": { "amount": 42.15, "currency": "BRL" }, "date": "2024-12-22" }` | **B** (Categoria B - Polling condicional 60s) | Exibir último snapshot em cache; se falhar, mostrar mensagem "Unable to load today's data" com botão retry |
| **Obter transações recentes** | `GET` | `/api/transactions/recent?limit=3` | Nenhum | `{ "transactions": [{ "id": "tx_001", "type": "received", "amount": { "value": 1450.00, "currency": "BRL" }, "description": "Payment from merchant #3421", "timestamp": "2024-12-22T13:45:00Z" }, ...] }` | **B** (Categoria B - Polling condicional 60s) | Exibir lista em cache; se vazia + erro, mostrar skeleton placeholders |
| **Obter status de pagamentos de hoje** | `GET` | `/api/dashboard/payment-status?date=2024-12-22` | Nenhum | `{ "completed": { "count": 24, "percentage": 75 }, "pending": { "count": 6, "percentage": 20 }, "cancelled_or_expired": { "count": 2, "percentage": 5 }, "total": 32 }` | **B** (Categoria B - Polling condicional 60s) | Exibir barras com último valor em cache; se falhar, desabilitar interação |

**Notas sobre classificação de queries:**
- **Saldo disponível (Categoria A):** Dado crítico que afeta decisões financeiras; deve ser atualizado explicitamente pelo usuário para evitar confusão com mudanças automáticas inesperadas.
- **Snapshot de hoje, Transações recentes, Status de pagamentos (Categoria B):** Dados que mudam ao longo do dia mas não requerem refresh constant; polling condicional (60s sem interação do usuário) balanceia frescor vs overhead de rede.

## Ações de escrita (commands)

| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| **Criar link de pagamento** | `POST` | `/api/payment-links` | `{ "payment_type": "one_time" \| "fixed", "template_id": "tpl_abc123", "value_mode": "inform" \| "client_picks", "currency_mode": "brl" \| "template_currency", "amount": 100.50 (opcional, apenas se value_mode="inform"), "webhook_url": "https://..." (opcional), "redirect_url": "https://..." (opcional) }` | Toast de sucesso + Modal exibe payment link gerado + Opção de copiar/abrir link | ✓ |
| **Navegar para Withdraw** | Navegação client-side | N/A - `onNavigate('withdraw')` | N/A | Rota para página Withdraw | ✗ (não é write action) |

**Detalhes sobre "Criar link de pagamento":**
- Ação iniciada pelo botão "Receive payment"
- Abre modal multi-step (`ReceivePaymentModal`)
- **Step 1:** Selecionar tipo de pagamento (one-time vs fixed link)
- **Step 2:** Configurar pagamento (template, valor, webhooks/redirect em Advanced Settings)
- **Step 3 (após MFA):** Exibir link gerado com botões "Copy" e "Open"
- **Requer MFA:** Sim - ao clicar "Create Payment Link", modal de MFA aparece; após confirmação, API cria o link
- **Refetch após sucesso:** Não afeta dados da Dashboard (não requer refetch)

## Guia interno do produto

### Quando usar
- **Primeira tela após login:** Overview �� a landing page padrão; todo usuário (independentemente de role) vê esta view primeiro
- **Check rápido de saldo:** Comerciantes acessam Overview múltiplas vezes ao dia para verificar saldo antes de solicitar saque
- **Início de jornada de criação de pagamento:** Botão "Receive payment" é ponto de entrada principal para gerar links de checkout
- **Monitoramento de atividade diária:** Card "Today" fornece KPIs de alto nível; usuários que precisam de detalhes clicam "View details" para ir ao Analytics

### Dependências
- **Templates de pagamento:** Dropdown "Select template" no modal Receive Payment depende de `/api/templates` (se nenhum template existir, deve mostrar mensagem "No templates available - Create one first")
- **Balances view:** Saldo exibido deve ser consistente com `/src/app/views/BalancesView.tsx` (mesma API `/api/balance/available`)
- **Analytics view:** Link "View details" no card Today navega para Analytics com parâmetro `dateRange` pré-filtrado para hoje
- **Statement view:** Link "View all" no card Recent Activity navega para Statement page
- **Withdraw view:** Botão "Withdraw" navega para Withdraw page (role-restricted para Admin/Operations)

### Casos extremos

#### Saldo zerado ou negativo
- **Comportamento:** Exibir valor normalmente (R$ 0,00 ou R$ -50,00 se aplicável)
- **UI adicional:** Se saldo <= 0, considerar desabilitar botão "Withdraw" com tooltip "Insufficient balance"
- **Backend:** API deve retornar saldo real; frontend não deve validar ou alterar valor

#### Nenhuma transação hoje
- **Comportamento no card Today:** Exibir R$ 0,00 para todos os campos (received, pending, fees)
- **Comportamento em Recent Activity:** Exibir mensagem "No recent transactions" em vez de lista vazia
- **Comportamento em Payment Status:** Todas as barras em 0%, total count = 0

#### Erro ao carregar dados (API down)
- **Saldo:** Exibir último valor em cache com badge "STALE" e botão "Refresh" visible
- **Cards informativos:** Exibir skeleton loaders por 5s, depois mensagem "Unable to load data" com botão "Retry"
- **Ações:** Botões "Receive payment" e "Withdraw" devem permanecer funcionais (não dependem de query data)

#### Primeiro acesso (novo usuário)
- **Saldo:** Provavelmente R$ 0,00 (ok exibir)
- **Today snapshot:** Todos zeros (ok exibir)
- **Recent Activity:** Vazio → Exibir mensagem motivacional "Ready to receive your first payment?" com destaque no botão "Receive payment"
- **Payment Status:** Sem dados → Ocultar card completamente ou mostrar "No payments yet"

#### Role restrictions
- **Botão Withdraw:** Apenas visible para roles `user_admin_crossramp` e `user_operations_crossramp`
- **Botão Receive Payment:** Apenas visible para roles `user_admin_crossramp` e `user_operations_crossramp`
- **Roles sem permissão (analyst, developer):** Ver saldo + cards informativos, mas ambos os botões de ação (Withdraw e Receive Payment) não aparecem

#### Timezone considerations
- **"Today":** Baseado em timezone do usuário (frontend) ou servidor (backend)? → **Decisão necessária:** Recomendação é usar timezone do usuário (browser local time) para UX consistente, mas backend deve receber parâmetro `?timezone=America/Sao_Paulo` para retornar dados corretos
- **Timestamp "Updated 2 min ago":** Calcular relativetime no frontend usando biblioteca como `date-fns` (`formatDistanceToNow`)

#### Long-running data (muitas transações)
- **Recent Activity:** Sempre limitar a 3 itens mais recentes; se usuário quer mais, clica "View all"
- **Payment Status counts:** Se total > 1000 pagamentos, considerar exibir percentages em vez de counts absolutos para evitar números muito grandes

### Melhorias futuras

#### Refresh automático inteligente
- Implementar WebSocket connection para receber updates em tempo real quando novo pagamento é recebido
- Push notification no browser ("New payment of R$ 150 received")
- Badge de "new activity" no ícone Overview na sidebar quando usuário está em outra página

#### Customização de cards
- Permitir usuário reordenar cards (drag-and-drop)
- Adicionar/remover cards opcionais (ex: "Withdrawal limits", "KYC status summary")
- Salvar preferências em Zustand store (`userPreferences.dashboardCardOrder`)

#### Gráficos inline
- Adicionar sparkline (mini-gráfico de linha) no card Today mostrando tendência de pagamentos ao longo das últimas 24h
- Tornar barras de Payment Status clicáveis para filtrar Analytics por status

#### Quick actions adicionais
- Botão "Request Report" direto na Overview (atualmente em Reports > Statement)
- Botão "Add to Whitelist" se usuário tem saques pendentes mas nenhum endereço whitelistado

#### Comparação temporal
- No card Today, adicionar badge "+15% vs yesterday" para payments received
- Tooltip "View trend" abre mini-modal com gráfico comparativo última semana

#### Notificações inline
- Se KYC não verificado, banner no topo da Overview: "Complete KYC to unlock withdrawals"
- Se reputation score < 50, warning banner: "Low reputation score may affect fees"
- Se nenhum template criado, CTA banner: "Create your first payment template to get started"

---

**Classificação final de queries:**
- Saldo disponível → **Categoria A**
- Snapshot de hoje, Transações recentes, Status de pagamentos → **Categoria B**

**Write actions:**
- Criar payment link → **Requer MFA** ✓

**Role access:**
- View completa: Todos os roles (Admin, Operations, Analyst, Developer)
- Botão Withdraw: Admin + Operations apenas
- Botão Receive Payment: Admin + Operations apenas