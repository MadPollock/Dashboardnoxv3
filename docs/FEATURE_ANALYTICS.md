# Feature Documentation: Analytics

**Status:** ✅ **100% IMPLEMENTED** (December 2024)

**Componente de View:** `/src/app/views/AnalyticsView.tsx`  
**Componentes de Chart:** 
- `/src/app/components/analytics/VolumeOverviewChart.tsx`
- `/src/app/components/analytics/PaymentsOverviewChart.tsx`
- `/src/app/components/analytics/ConversionRateChart.tsx`
- `/src/app/components/analytics/FeesChart.tsx`
- `/src/app/components/analytics/DateRangeSelector.tsx`

**Query Functions:** `/src/app/lib/queries.ts`
- `queryAnalyticsMetrics()` - Aggregated metrics endpoint
- `queryVolumeOverview()` - Volume time series
- `queryPaymentsOverview()` - Payments time series
- `queryConversionRates()` - Conversion time series
- `queryFees()` - Fees time series

**ID de Rota/Navegação:** `analytics`

## ✅ Implementation Status

**Query Integration:** COMPLETE
- [x] `queryAnalyticsMetrics()` function added to queries.ts
- [x] All 5 query functions integrated into AnalyticsView
- [x] `useQuery` hooks used for all data fetching
- [x] Loading states with skeleton loaders
- [x] Error states with retry buttons
- [x] Empty states handled gracefully
- [x] Date range changes trigger refetch
- [x] Manual refresh button implemented

**RBAC Enforcement:** COMPLETE
- [x] `useAuth()` hook integrated
- [x] `hasRole('admin')` check enforced
- [x] Access denied page for unauthorized users
- [x] TODO: Add 'operations' and 'analyst' roles when available

**UI/UX Features:** COMPLETE
- [x] 4 metric cards with change indicators (↑↓ arrows)
- [x] TrendingUp/TrendingDown icons with color coding
- [x] Green for positive, red for negative trends
- [x] Null change_percent handled gracefully
- [x] Responsive grid (1/2/4 columns)
- [x] All 4 charts with loading/error/empty states
- [x] Refresh button with spinner animation
- [x] Date range selector integrated

**Translations:** COMPLETE (EN/PT/ES)
- [x] All metric labels translated
- [x] All chart labels translated
- [x] Error states: `analytics.error`, `analytics.retry`
- [x] Empty states: `analytics.empty`
- [x] Loading states: `analytics.loading`
- [x] Refresh button: `analytics.refresh`

**API Contract:** See `/docs/API_CONTRACT_ANALYTICS.md`
- [x] 5 GET endpoints documented
- [x] Request/response schemas defined
- [x] Mock data generators implemented
- [x] Real API integration ready (mock mode enabled)

## História de usuário

**Como** administrador ou operador do Crossramp,  
**Eu quero** visualizar métricas agregadas e gráficos históricos de volume, pagamentos, conversão e taxas dentro de intervalos de datas personalizados,  
**Para que** eu possa analisar performance do meu negócio, identificar tendências, tomar decisões informadas sobre precificação e operações, e apresentar dados financeiros para stakeholders ou auditoria.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso **full** (read-only)
  - Analyst (`user_analyst_crossramp`) tem acesso **read-only** (mesmo que Admin/Ops neste caso)
  - Developer não tem acesso (página não aparece na navegação)
- **Date range selector** - Componente principal no topo que filtra todas métricas e charts
  - Presets: Last 7 days, Last 30 days, Last 90 days, This month, Last month, Custom
  - Custom mode: Date pickers para from/to
  - Default: Last 30 days
  - Ao mudar date range → refetch ALL queries
- **4 Metric Cards (Top KPIs)** - Grid responsivo (1 col mobile, 2 cols tablet, 4 cols desktop):
  1. **Volume Overview** - Total volume processado em BRL (payments in + payments out combined)
  2. **Payments Overview** - Total de pagamentos completos (count, não valor)
  3. **Conversion Rate** - Taxa média de conversão (% de payments criados que foram completed)
  4. **Net Fees** - Taxas líquidas (fees received - fees paid)
- **4 Charts (2x2 Grid)** - Gráficos de linha/barra usando Recharts:
  1. **Volume Overview Chart** - Line chart com 3 séries (Payments In, Payments Out, Combined)
  2. **Payments Overview Chart** - Stacked bar chart com status breakdown (Completed, Pending, Expired, Cancelled) separado por In/Out
  3. **Conversion Rate Chart** - Line chart com % ao longo do tempo (Payments In, Payments Out, Combined)
  4. **Fees Chart** - Bar chart com Fees Paid vs Fees Received
- **Granularity auto-ajustada:** 
  - ≤7 days → Daily data points
  - 8-30 days → Daily ou Weekly
  - 31-90 days → Weekly
  - >90 days → Monthly
  - Backend determina granularity ideal baseado em date range
- **No write actions:** Esta página é 100% read-only (apenas visualização)
- **Refresh button:** Botão manual de refresh próximo ao date selector para refetch data (Categoria A)
- **Loading states:** Skeleton loaders nos cards e charts enquanto data está carregando
- **Empty state:** Se não houver dados no período: "No data available for selected date range. Try selecting a different period."
- **Error state:** Se queries falharem: "Failed to load analytics. [Retry]"
- **Responsive:** 
  - Mobile: Metrics em 1 coluna, charts stacked verticalmente
  - Tablet: Metrics em 2 colunas, charts em 1 coluna
  - Desktop: Metrics em 4 colunas, charts em 2x2 grid
- **Export suggestion:** Banner no topo (collapsed por default) sugerindo "Need detailed analytics? Request a custom report" → link para Reports/Statement

## Bucket Strategy para Queries

Para evitar respostas massivas e permitir caching granular, **recomendo separar as queries em 2 buckets:**

### **Bucket 1: Aggregated Metrics (Top KPIs)**
- **Single endpoint** que retorna os 4 KPIs agregados
- Cache TTL: 5 minutos (relativamente estável)
- Payload pequeno (~200 bytes)
- Usado apenas pelos metric cards

### **Bucket 2: Time Series Data (Charts)**
- **4 endpoints separados** (um para cada chart)
- Permite cachear charts independentemente
- Client pode escolher não carregar charts não visíveis (lazy load)
- Payloads maiores (~2-10KB cada)

**Alternativa (se preferir):** Single "uber-endpoint" `/api/analytics/dashboard` que retorna TUDO (metrics + all charts). Mais simples mas menos flexível.

**Decisão recomendada:** Bucket strategy (5 endpoints separados) para flexibilidade + caching granular.

---

## Ações de leitura (queries)

### **Bucket 1: Aggregated Metrics**

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter métricas agregadas** | `GET` | `/api/analytics/metrics` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "timezone": "America/Sao_Paulo" }` | `{ "total_volume": { "amount": 1250000.50, "currency": "BRL", "change_percent": 12.5 }, "total_payments": { "count": 847, "change_percent": 8.3 }, "avg_conversion_rate": { "rate": 68.4, "change_percent": -2.1 }, "net_fees": { "fees_received": 35000.00, "fees_paid": 12000.00, "net": 23000.00, "currency": "BRL", "change_percent": 15.7 }, "period": { "from": "2025-11-22T00:00:00Z", "to": "2025-12-22T23:59:59Z" } }` | **A** (Categoria A - Manual refresh only) | Toast "Failed to load metrics" + Retry button nos cards |

**Detalhes sobre "Obter métricas agregadas":**
- **Parâmetros:**
  - `date_from` (obrigatório): ISO 8601 timestamp (inclusive)
  - `date_to` (obrigatório): ISO 8601 timestamp (inclusive)
  - `timezone` (opcional): IANA timezone string (default: UTC)
- **Cálculos:**
  - `total_volume`: Soma de ALL payments (in + out, apenas completed) em BRL equivalente
  - `total_payments`: Count de payments com status=completed (in + out)
  - `avg_conversion_rate`: (Completed payments / Created payments) * 100 (média do período)
  - `net_fees`: Total fees received (de customers) - Total fees paid (para networks/partners)
  - `change_percent`: Comparação com período anterior de mesma duração (ex: se selecionou 30 dias, compara com 30 dias anteriores)
- **Performance:** Query deve ser otimizada (indexed by date + status)
- **Cache:** Backend pode cachear por 5 minutos para mesma date range

---

### **Bucket 2: Time Series Data (Charts)**

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter série temporal de volume** | `GET` | `/api/analytics/volume-series` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "granularity": "daily", "timezone": "America/Sao_Paulo" }` | `{ "series": [{ "period": "2025-11-22", "period_label": "Nov 22", "payments_in": 125000.50, "payments_out": 98000.30, "combined": 223000.80, "currency": "BRL" }, { "period": "2025-11-23", "period_label": "Nov 23", "payments_in": 142000.75, "payments_out": 105000.50, "combined": 247001.25, "currency": "BRL" }], "granularity": "daily", "total_data_points": 31 }` | **A** (Categoria A - Manual refresh only) | Chart mostra "Failed to load data" + Retry button |
| **Obter série temporal de pagamentos** | `GET` | `/api/analytics/payments-series` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "granularity": "daily", "timezone": "America/Sao_Paulo" }` | `{ "series": [{ "period": "2025-11-22", "period_label": "Nov 22", "in_completed": 45, "in_pending": 12, "in_expired": 5, "in_cancelled": 3, "out_completed": 38, "out_pending": 8, "out_expired": 2, "out_cancelled": 1 }, { "period": "2025-11-23", "period_label": "Nov 23", "in_completed": 52, "in_pending": 15, "in_expired": 4, "in_cancelled": 2, "out_completed": 41, "out_pending": 10, "out_expired": 3, "out_cancelled": 2 }], "granularity": "daily", "total_data_points": 31 }` | **A** (Categoria A - Manual refresh only) | Chart mostra "Failed to load data" + Retry button |
| **Obter série temporal de conversão** | `GET` | `/api/analytics/conversion-series` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "granularity": "daily", "timezone": "America/Sao_Paulo" }` | `{ "series": [{ "period": "2025-11-22", "period_label": "Nov 22", "payments_in_rate": 68.5, "payments_out_rate": 72.3, "combined_rate": 70.4 }, { "period": "2025-11-23", "period_label": "Nov 23", "payments_in_rate": 71.2, "payments_out_rate": 69.8, "combined_rate": 70.5 }], "granularity": "daily", "total_data_points": 31, "calculation_note": "Rate = (Completed / Created) * 100" }` | **A** (Categoria A - Manual refresh only) | Chart mostra "Failed to load data" + Retry button |
| **Obter série temporal de taxas** | `GET` | `/api/analytics/fees-series` | `{ "date_from": "2025-11-22T00:00:00Z", "date_to": "2025-12-22T23:59:59Z", "granularity": "daily", "timezone": "America/Sao_Paulo", "currency": "BRL" }` | `{ "series": [{ "period": "2025-11-22", "period_label": "Nov 22", "fees_paid": 450.30, "fees_received": 1200.50, "net_fees": 750.20, "currency": "BRL" }, { "period": "2025-11-23", "period_label": "Nov 23", "fees_paid": 520.75, "fees_received": 1350.80, "net_fees": 830.05, "currency": "BRL" }], "granularity": "daily", "total_data_points": 31, "breakdown": { "total_fees_paid": 12000.00, "total_fees_received": 35000.00, "total_net_fees": 23000.00 } }` | **A** (Categoria A - Manual refresh only) | Chart mostra "Failed to load data" + Retry button |

**Detalhes sobre séries temporais:**

**Parâmetros comuns:**
- `date_from` (obrigatório): ISO 8601 timestamp
- `date_to` (obrigatório): ISO 8601 timestamp
- `granularity` (opcional): `"daily"` | `"weekly"` | `"monthly"` (backend auto-determina se não fornecido)
- `timezone` (opcional): IANA timezone (default: UTC)

**Granularity logic (backend):**
```
if (days <= 7) → granularity = "daily"
if (days > 7 && days <= 30) → granularity = "daily" (max 30 points)
if (days > 30 && days <= 90) → granularity = "weekly" (max 13 points)
if (days > 90) → granularity = "monthly" (max 12 points)
```

**Response fields:**
- `period`: ISO date string (YYYY-MM-DD for daily, first day of week for weekly, YYYY-MM for monthly)
- `period_label`: Human-readable label for chart x-axis (ex: "Nov 22", "Week of Nov 20", "Nov 2025")
- `total_data_points`: Total number of periods in series (for validation)

**Performance:**
- Each query should be optimized with date + status indexes
- Consider pre-aggregating daily stats in materialized view (refresh nightly)
- Cache time series for 10 minutes (same date range)

**Data completeness:**
- If a period has NO data (zero transactions), still return data point with zeros
- Example: `{ "period": "2025-11-25", "payments_in": 0, "payments_out": 0, "combined": 0 }`
- This ensures chart x-axis is continuous (no gaps)

---

## Ações de escrita (commands)

**Nenhuma ação de escrita.** Analytics é uma página 100% read-only.

**Nota:** Se no futuro houver necessidade de "salvar análises personalizadas" ou "criar alertas baseados em métricas", estas seriam write actions separadas.

---

## Guia interno do produto

### Quando usar
Merchant/Ops acessa Analytics quando:
1. **Review diário:** Check matinal de performance (volume, pagamentos, taxas)
2. **Análise de tendências:** Identificar crescimento ou queda em períodos específicos
3. **Preparação financeira:** Exportar dados para relatórios mensais/trimestrais
4. **Troubleshooting:** Verificar se queda em conversão coincide com período de downtime
5. **Stakeholder reporting:** Gerar screenshots de charts para apresentações executivas
6. **Auditoria:** Validar que fees cobrados/pagos estão corretos

### Dependências
- **Transactions/Payments:** Todas métricas são derivadas de transações
- **Fees configuration:** Net fees calculation depende de fee structure configurada
- **Date Range Selector:** Componente compartilhado com Payments, Disputes, Statement
- **Timezone awareness:** Importante para merchants multi-região (ex: vendas em horário local)

### Métricas explicadas

#### 1. Volume Overview (Total Volume Processado)
**O que é:** Soma de TODO o valor monetário que passou pela plataforma (payments in + payments out) em BRL equivalente.

**Cálculo:**
```
total_volume = SUM(payments.amount WHERE status='completed' AND date BETWEEN from AND to)
// Se payment é em USDT, converter para BRL usando taxa da data do payment
```

**Exemplo:**
- 100 payments in de R$1.000 cada = R$100.000
- 50 payments out de R$800 cada = R$40.000
- **Total volume = R$140.000**

**Interpretação:**
- Volume alto = merchant está processando muito dinheiro (bom sinal de atividade)
- Volume crescendo = negócio expandindo
- Volume caindo = pode indicar problema (sazonalidade, perda de clientes, downtime)

**Change percent:**
- Compara com período anterior de mesma duração
- Ex: Se último 30 dias foi R$140k e 30 dias anteriores foi R$120k → +16.7%

#### 2. Payments Overview (Total de Pagamentos Completos)
**O que é:** Quantidade (count, não valor) de pagamentos que foram completados com sucesso.

**Cálculo:**
```
total_payments = COUNT(payments WHERE status='completed' AND date BETWEEN from AND to)
```

**Exemplo:**
- 150 payments in completed
- 80 payments out completed
- **Total payments = 230**

**Interpretação:**
- Payments count alto = alta atividade transacional
- Average ticket = total_volume / total_payments (ex: R$140k / 230 = R$608 por payment)

**Nota:** Exclui payments pending, expired, cancelled (só conta completed)

#### 3. Conversion Rate (Taxa de Conversão)
**O que é:** Percentual de payments criados que foram completados (mede eficiência do checkout).

**Cálculo:**
```
conversion_rate = (COUNT(payments WHERE status='completed') / COUNT(payments WHERE status IN ['completed','expired','cancelled'])) * 100
// Exclui pending do denominador (ainda pode converter)
```

**Exemplo:**
- 300 payments criados
- 200 completed
- 50 expired
- 30 cancelled
- 20 pending
- **Conversion rate = 200 / (200+50+30) = 71.4%**

**Interpretação:**
- 70-80% = excelente (industry standard)
- 50-70% = razoável (pode melhorar UX do checkout)
- <50% = problema sério (checkout confuso, bugs, fees muito altas)

**Diferença In vs Out:**
- `payments_in_rate`: Conversão de checkouts (customers pagando merchant)
- `payments_out_rate`: Conversão de withdrawals (merchant sacando fundos)
- `combined_rate`: Média ponderada

#### 4. Net Fees (Taxas Líquidas)
**O que é:** Diferença entre fees que merchant recebeu de customers e fees que merchant pagou para Crossramp/networks.

**Cálculo:**
```
fees_received = SUM(payments_in.fee_amount WHERE fee_payer='customer' AND status='completed')
fees_paid = SUM(payments_out.network_fee + crossramp_fee WHERE status='completed')
net_fees = fees_received - fees_paid
```

**Exemplo:**
- Fees received: R$35.000 (customers pagaram taxas em checkouts)
- Fees paid: R$12.000 (merchant pagou para Crossramp + network fees)
- **Net fees = R$23.000** (lucro líquido de fees)

**Interpretação:**
- Net fees positivo = merchant está "ganhando" com fee structure (passa fees para customer)
- Net fees negativo = merchant está absorvendo fees (pode ser estratégia de growth)
- Net fees zero = fee-neutral (fees recebidos cobrem fees pagos)

**Nota:** Não inclui revenue de merchant (produtos vendidos), apenas fees transacionais

### Charts explicados

#### 1. Volume Overview Chart (Line Chart)
**3 séries temporais:**
- **Payments In (blue):** Volume de payments recebidos (customers → merchant)
- **Payments Out (orange):** Volume de withdrawals (merchant → bank/wallet)
- **Combined (green):** Soma de in + out

**Uso:** Identificar padrões sazonais (ex: picos em finais de semana, quedas em feriados)

#### 2. Payments Overview Chart (Stacked Bar Chart)
**8 categorias empilhadas:**
- In: Completed, Pending, Expired, Cancelled
- Out: Completed, Pending, Expired, Cancelled

**Cores:** Verde (completed), Amarelo (pending), Cinza (expired), Vermelho (cancelled)

**Uso:** Ver breakdown de status ao longo do tempo. Se expired crescendo → problema de UX.

#### 3. Conversion Rate Chart (Line Chart)
**3 séries temporais:**
- **Payments In Rate (%):** Conversão de checkouts
- **Payments Out Rate (%):** Conversão de withdrawals
- **Combined Rate (%):** Média

**Uso:** Monitorar se conversion está melhorando ou piorando. Correlacionar com mudanças no produto.

#### 4. Fees Chart (Bar Chart)
**2 barras por período:**
- **Fees Paid (red):** Quanto merchant pagou
- **Fees Received (green):** Quanto merchant recebeu de customers

**Uso:** Ver evolução de fee structure. Se fees paid crescendo muito → renegociar com Crossramp.

### Casos extremos

#### 1. Date range muito longo (>1 ano)
**Cenário:** Merchant seleciona "Last 365 days"  
**Tratamento:**
- Backend retorna granularity=monthly (12 data points)
- Frontend mostra warning: "⚠️ Long date ranges are aggregated monthly. For daily data, select a shorter period."
- Query pode ser lenta (>5s) → mostrar skeleton loader
- Considerar limit máximo (ex: 180 days) para proteger performance

#### 2. Date range no futuro
**Cenário:** Merchant seleciona custom date range com `date_to` no futuro  
**Tratamento:**
- Frontend valida: `date_to` não pode ser > now
- Se passar, backend clipa automaticamente para now
- Retornar warning: `"date_to adjusted to current time"`

#### 3. Zero data no período
**Cenário:** Merchant acabou de criar conta, seleciona "Last 30 days" mas só tem 2 dias de dados  
**Tratamento:**
- Metrics cards mostram zeros (R$0.00, 0 payments, 0% conversion)
- Charts mostram empty state: "No data available for selected period. Complete your first transaction to see analytics."
- Não mostrar erro, apenas empty state educativo

#### 4. Conversion rate impossível (>100%)
**Cenário:** Bug de dados onde completed > created (não deveria acontecer)  
**Tratamento:**
- Backend valida: `conversion_rate = min(100, calculated_rate)`
- Frontend clipa em display: `Math.min(100, rate).toFixed(2)`
- Log warning para debug

#### 5. Multi-currency handling
**Cenário:** Merchant processa BRL + USDT + USDC. Como agregar em "Total Volume"?  
**Tratamento:**
- Backend converte TUDO para BRL usando taxa da data do payment
- Response inclui breakdown por currency: `"currency_breakdown": { "BRL": 100000, "USDT": 50000, "USDC": 30000 }`
- Frontend mostra total em BRL com footnote: "Multi-currency payments converted to BRL at transaction date rate"

#### 6. Timezone mismatch
**Cenário:** Merchant está em São Paulo (-03:00), analytics usa UTC  
**Tratamento:**
- Frontend envia `timezone: "America/Sao_Paulo"` em todas queries
- Backend agrupa por date usando timezone do merchant
- Response inclui timezone usado: `"timezone_applied": "America/Sao_Paulo"`
- Se timezone não fornecido, usa timezone do perfil merchant (cadastrado)

#### 7. Change percent undefined (primeiro período)
**Cenário:** Merchant novo, não tem "período anterior" para comparar  
**Tratamento:**
- Backend retorna `change_percent: null`
- Frontend não mostra seta de trend (nem up nem down)
- Mostra badge "New" ou apenas omite o change indicator

### Notas para Ops/CS

#### Troubleshooting comum

**"Meus números não batem com meu banco"**
- **Causa provável:** Timezone mismatch ou merchant comparando "settled" vs "completed"
- **Solução:**
  1. Verificar timezone configurado no perfil
  2. Explicar que Analytics mostra payments "completed" (quando customer pagou), não quando merchant recebeu settlement
  3. Para reconciliação bancária, usar Statement page (mostra settled amounts)

**"Conversion rate caiu de 80% para 50%"**
- **Investigar:**
  1. Houve downtime no período? (correlacionar com incident reports)
  2. Merchant mudou template de pagamento? (pode ter confundido customers)
  3. Fees aumentaram? (customers abandonando checkout)
  4. Mudança sazonal? (ex: Natal vs Janeiro)
- **Solução:** Analisar Payments page com filtros para identificar padrão de expired/cancelled

**"Fees Paid está muito alto"**
- **Causa:** Network fees de blockchain podem variar muito (gas fees ETH)
- **Explicar:** Fees paid incluem:
  - Crossramp processing fee (fixo, ex: 1.5%)
  - Network fee (variável, depende de congestionamento blockchain)
- **Solução:** Sugerir usar TRX (USDT-TRC20) em vez de ETH (fees 10x menores)

**"Chart não carrega (stuck em loading)"**
- **Causa:** Query timeout (date range muito longo) ou network issue
- **Solução:**
  1. Pedir para reduzir date range (ex: 90 dias → 30 dias)
  2. Verificar network tab no browser (F12) para ver erro
  3. Clear cache + hard refresh (Ctrl+Shift+R)

**"Quero exportar esses dados para Excel"**
- **Solução atual:** Screenshot + copiar números manualmente
- **Solução melhor:** Sugerir usar "Request Report" button → gera CSV com ALL data
- **Future feature:** Botão "Export as CSV" direto na Analytics page

### Melhorias futuras

1. **Comparative view:** Overlay de 2 períodos no mesmo chart (ex: "Last 30 days" vs "Previous 30 days")
2. **Benchmarking:** Mostrar "Industry average conversion rate: 72%" para contexto
3. **Drill-down:** Clicar em data point do chart → filtra Payments page para aquele dia
4. **Custom metrics:** Merchant define KPIs personalizados (ex: "Average ticket size", "Refund rate")
5. **Alerts:** Configurar alertas (ex: "Notify me if conversion < 60% for 3 days")
6. **Forecast:** IA prediz volume dos próximos 7 dias baseado em histórico
7. **Cohort analysis:** Comparar performance de cohorts de customers (new vs returning)
8. **Currency breakdown chart:** Pie chart mostrando % de volume por moeda
9. **Geo analytics:** Mapa mostrando de onde vêm os payments (IP geolocation)
10. **Real-time mode:** Toggle para live updates (websocket) em vez de manual refresh

### Best practices para compartilhar com merchants

1. **Check diariamente:** Olhar analytics todo dia (mesmo que rápido) para pegar anomalias cedo
2. **Set baselines:** Saber qual é seu "normal" (ex: conversion típica = 75%, volume médio/dia = R$5k)
3. **Correlate events:** Quando ver mudança brusca, perguntar "o que mudou?" (promo, novo produto, bug)
4. **Use custom ranges:** Presets são convenientes mas custom ranges dão mais precisão
5. **Compare periods:** Mentalmente compare com "same time last month" ou "last year" (sazonalidade)
6. **Focus on trends:** 1 dia ruim não é problema; 7 dias em queda é trend que precisa ação
7. **Document insights:** Anotar observações (ex: "Black Friday sempre tem conversion -10% mas volume +200%")
8. **Share with team:** Usar screenshots para alinhar time em goals (ex: "Vamos manter conversion >70%")
9. **Don't over-optimize:** Pequenas variações (±5%) são ruído estatístico, não aja impulsivamente
10. **Context matters:** Analytics mostra "o que", não "por que". Investigar causas antes de concluir.