# Feature Documentation: API Integration

**Componente de View:** `/src/app/views/APIIntegrationView.tsx`  
**ID de Rota/Navegação:** `api-integration` (under Developers section)

## História de usuário

**Como** desenvolvedor ou administrador técnico do merchant,  
**Eu quero** gerenciar minhas API keys (criar, desabilitar, visualizar status), acessar documentação técnica completa (code reference, guias de implementação, webhooks), e entender os fluxos de integração,  
**Para que** eu possa integrar Crossramp com meus sistemas (e-commerce, backoffice, mobile app), automatizar operações via API, receber notificações em tempo real via webhooks, e manter minhas credenciais seguras com rotação apropriada.

## Notas de UX

- **Role-restricted:** 
  - Admin (`user_admin_crossramp`) tem acesso **full** (read + write - create/disable API keys)
  - Developer (`user_developer_crossramp`) tem acesso **full** (read + write - create/disable API keys)
  - Operations (`user_operations_crossramp`) tem acesso **read-only** (vê API keys mas não pode criar/desabilitar)
  - Analyst NÃO tem acesso (página não aparece na navegação)
- **Two main sections:**
  1. **Resources Grid** - 4 cards com links para documentação externa
     - Code Reference (API endpoints, request/response schemas)
     - Implementation Guide (step-by-step setup)
     - Webhooks Guide (eventos, configuração, segurança)
     - Flows Guide (diagramas de fluxo onramp/offramp)
  2. **API Keys Management** - Table com keys + actions (create, disable)
- **Create API Key flow:**
  - Requer MFA ativo (button disabled se MFA não ativo)
  - Botão "Create" com Lock + Plus icons (visual de write action)
  - Abre MFAModal → Merchant entra código 2FA
  - Nova key é criada com status `waiting_approval`
  - Crossramp Ops aprova manualmente (torna `active`)
- **API Key lifecycle:**
  1. **Created** → Status: `waiting_approval` (aguardando Ops aprovar)
  2. **Approved by Ops** → Status: `active` (key funciona)
  3. **Disabled** → Status: `disabled` (key não funciona mais)
- **Disable API Key flow:**
  - Apenas keys `active` podem ser disabled
  - Botão "Disable" na linha da key (texto vermelho)
  - Abre MFAModal → Merchant confirma com 2FA
  - Key muda para status `disabled` (permanente, não pode reativar)
- **API Keys table:**
  - Columns: Name, Key (masked), Status (badge), Created (date), Created By (email), Actions
  - Key format: `pk_live_••••••••••••••••1234` (prefixo + dots + últimos 4 chars)
  - Status badges: Active (green/orange), Waiting Approval (yellow), Disabled (gray)
  - Empty state: Key icon + "No API keys yet"
- **Warning banner:** Info banner explicando que API keys NÃO devem ser compartilhadas e devem ser armazenadas em variáveis de ambiente
- **Resource cards:** Hoverable cards com ícone, título, descrição, external link icon
  - Hover: scale up, border color change, shadow
  - Click: abre docs em nova aba
- **Responsive:** Grid 2 columns (desktop), 1 column (mobile), table scroll horizontal

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Listar API keys** | `GET` | `/api/api-keys/list` | `{}` | `{ "api_keys": [{ "id": "apk_001", "name": "Production API", "key_prefix": "pk_live_", "key_masked": "pk_live_••••••••••••••••1234", "key_last_4": "1234", "status": "active", "created_at": "2024-01-15T10:00:00Z", "created_by": "admin@company.com", "created_by_user_id": "usr_123", "last_used_at": "2025-12-22T10:30:00Z", "environment": "production", "permissions": ["read:payments", "write:payments", "read:balances"], "ip_whitelist": ["203.0.113.0/24"], "rate_limit": 1000 }, { "id": "apk_002", "name": "Staging Environment", "key_prefix": "pk_test_", "key_masked": "pk_test_••••••••••••••••5678", "key_last_4": "5678", "status": "waiting_approval", "created_at": "2024-12-18T14:30:00Z", "created_by": "dev@company.com", "created_by_user_id": "usr_456", "last_used_at": null, "environment": "staging", "permissions": ["read:payments", "read:balances"], "ip_whitelist": [], "rate_limit": 100 }], "total_count": 3, "active_count": 1, "waiting_approval_count": 1, "disabled_count": 1 }` | **C** (Categoria C - Load once on page mount) | Toast "Failed to load API keys" + Empty state com Retry button |
| **Obter detalhes de uma API key** | `GET` | `/api/api-keys/details` | `{ "api_key_id": "apk_001" }` | `{ "id": "apk_001", "name": "Production API", "key_prefix": "pk_live_", "key_masked": "pk_live_••••••••••••••••1234", "key_last_4": "1234", "status": "active", "created_at": "2024-01-15T10:00:00Z", "created_by": "admin@company.com", "created_by_user_id": "usr_123", "last_used_at": "2025-12-22T10:30:00Z", "environment": "production", "permissions": ["read:payments", "write:payments", "read:balances"], "ip_whitelist": ["203.0.113.0/24"], "rate_limit": 1000, "request_count_24h": 847, "request_count_7d": 5234, "request_count_30d": 18901, "last_request_ip": "203.0.113.45", "last_request_endpoint": "POST /v1/payments/create", "webhook_url": "https://merchant.com/webhooks/crossramp", "webhook_secret": "whsec_••••••••••••••••abcd", "notes": "Main production key for e-commerce integration" }` | **C** (Categoria C - Load on demand, modal/expandable row) | Toast "Failed to load key details" |
| **Obter usage stats de uma API key** | `GET` | `/api/api-keys/usage` | `{ "api_key_id": "apk_001", "period": "7d" }` | `{ "api_key_id": "apk_001", "period": "7d", "total_requests": 5234, "successful_requests": 5102, "failed_requests": 132, "error_rate": 2.52, "avg_response_time_ms": 245, "requests_by_day": [{ "date": "2025-12-16", "count": 823 }, { "date": "2025-12-17", "count": 756 }], "requests_by_endpoint": [{ "endpoint": "POST /v1/payments/create", "count": 3421 }, { "endpoint": "GET /v1/payments/list", "count": 1203 }], "errors_by_code": [{ "code": 401, "message": "Unauthorized", "count": 89 }, { "code": 429, "message": "Rate limit exceeded", "count": 43 }], "rate_limit_status": { "limit": 1000, "remaining": 876, "reset_at": "2025-12-22T11:00:00Z" } }` | **C** (Categoria C - Load on demand, dashboard/analytics modal) | Se falhar, não mostra usage stats (não bloqueia lista de keys) |

**Notas sobre classificação de queries:**

- **List API keys (Categoria C):** API keys são relativamente estáticos (merchant cria poucos, raramente desabilita). Load once on page mount. Refetch apenas após write actions (create/disable).
  
- **Key details (Categoria C):** Detalhes são loaded on-demand (ao expandir row ou abrir modal). Não precisa de polling.

- **Usage stats (Categoria C):** Stats são históricos/analytics (não mudam em real-time crítico). Load on-demand para exibir em dashboard ou modal de analytics.

**Security note:** 
- Endpoint `/api/api-keys/list` NÃO retorna a key completa (apenas masked)
- Key completa só é mostrada UMA VEZ ao criar (na response de create)
- Merchant deve copiar e salvar imediatamente (não pode recuperar depois)

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| **Criar API key** | `POST` | `/api/api-keys/create` | `{ "name": "Production API", "environment": "production", "permissions": ["read:payments", "write:payments", "read:balances", "write:withdrawals"], "ip_whitelist": ["203.0.113.0/24", "198.51.100.45"], "rate_limit": 1000, "webhook_url": "https://merchant.com/webhooks/crossramp", "notes": "Main API key for e-commerce integration", "mfa_code": "123456" }` | **Response única contém full key:** `{ "id": "apk_003", "name": "Production API", "key_full": "pk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6", "key_masked": "pk_live_••••••••••••••••o5p6", "key_last_4": "o5p6", "status": "waiting_approval", "created_at": "2025-12-22T14:45:00Z", "created_by": "admin@company.com", "webhook_secret": "whsec_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2", "warning": "Save this key now. You won't be able to see it again." }` + Toast "API key created successfully. Save it now!" + Banner destacado mostrando full key com botão "Copy" + Refetch lista | ✓ |
| **Desabilitar API key** | `POST` | `/api/api-keys/disable` | `{ "api_key_id": "apk_001", "reason": "Rotating credentials for security", "mfa_code": "123456" }` | Toast "API key disabled successfully" + Key na tabela muda status para `disabled` + Refetch lista | ✓ |
| **Regenerar API key** | `POST` | `/api/api-keys/regenerate` | `{ "api_key_id": "apk_001", "mfa_code": "123456" }` | **Response única contém new full key:** `{ "id": "apk_001", "name": "Production API", "key_full": "pk_live_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4", "key_masked": "pk_live_••••••••••••••••l5k4", "key_last_4": "l5k4", "status": "active", "regenerated_at": "2025-12-22T15:00:00Z", "old_key_disabled_at": "2025-12-22T15:00:00Z", "webhook_secret": "whsec_f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8", "warning": "Old key is now disabled. Update your integration with new key immediately." }` + Toast "API key regenerated. Old key disabled." + Banner com new key + Refetch lista | ✓ |
| **Atualizar permissões de API key** | `PATCH` | `/api/api-keys/update-permissions` | `{ "api_key_id": "apk_001", "permissions": ["read:payments", "read:balances"], "mfa_code": "123456" }` | Toast "API key permissions updated" + Refetch lista | ✓ |
| **Atualizar IP whitelist** | `PATCH` | `/api/api-keys/update-whitelist` | `{ "api_key_id": "apk_001", "ip_whitelist": ["203.0.113.0/24", "198.51.100.0/24"], "mfa_code": "123456" }` | Toast "IP whitelist updated successfully" + Refetch lista | ✓ |
| **Atualizar webhook URL** | `PATCH` | `/api/api-keys/update-webhook` | `{ "api_key_id": "apk_001", "webhook_url": "https://merchant.com/webhooks/crossramp-v2", "mfa_code": "123456" }` | Toast "Webhook URL updated" + Webhook secret regenerado automaticamente (security) + Refetch lista | ✓ |

**Detalhes sobre "Criar API key":**
- **Requer MFA:** Sim (obrigatório para todas write actions de API keys)
- **Validações backend esperadas:**
  - `name` obrigatório, max 100 chars, único por merchant
  - `environment` ∈ {production, staging, development}
  - `permissions` array não-vazio, cada permission válida (ex: `read:payments`, `write:withdrawals`)
  - `ip_whitelist` opcional, array de IPs ou CIDRs válidos
  - `rate_limit` opcional, default 1000 req/hour, max 10000 req/hour (depende do plano)
  - `webhook_url` opcional, HTTPS obrigatório (não aceita HTTP)
  - User tem role ∈ {Admin, Developer}
  - Merchant tem ≤ 10 active API keys (limit)
- **Comportamento pós-sucesso:**
  - Backend gera key única: `pk_live_` (production) ou `pk_test_` (staging) + 32 random chars
  - Backend gera webhook secret: `whsec_` + 32 random chars
  - Key criada com status `waiting_approval` (Ops deve aprovar manualmente)
  - Response retorna **full key UMA VEZ APENAS** (merchant deve copiar agora)
  - Frontend mostra banner destacado: "⚠️ Save this key now. You won't be able to see it again."
  - Banner tem botão "Copy to Clipboard" (auto-copy é bom UX)
  - Após merchant fechar banner, full key NUNCA é mostrada novamente (apenas masked)
  - Email de notificação enviado para merchant + Crossramp Ops (approval pending)
  - Frontend refetch `/api/api-keys/list`
- **Environment types:**
  - **production:** `pk_live_` prefix, rate limit alto, usado em prod
  - **staging:** `pk_test_` prefix, rate limit médio, usado em testes
  - **development:** `pk_dev_` prefix, rate limit baixo, sandbox
- **Permissions granulares:**
  - `read:payments` - Listar/visualizar payments
  - `write:payments` - Criar payments/checkouts
  - `read:balances` - Ver saldos de contas
  - `write:withdrawals` - Solicitar withdrawals
  - `read:templates` - Listar templates
  - `write:templates` - Criar/editar templates
  - `read:webhooks` - Ver logs de webhooks
  - `admin:*` - Acesso total (perigoso, evitar)
- **IP Whitelist:** Se configurado, apenas requests de IPs listados são aceitos (extra security)
- **Refetch após sucesso:** Sim - Categoria C (debounce 500ms)

**Detalhes sobre "Desabilitar API key":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `api_key_id` existe e pertence ao merchant
  - Key status = `active` ou `waiting_approval` (não pode disable uma key já disabled)
  - `reason` obrigatório, max 500 chars (audit trail)
  - User tem role ∈ {Admin, Developer}
- **Comportamento pós-sucesso:**
  - Key status muda para `disabled` (permanente, não pode reativar)
  - Todos requests usando esta key falham com 401 Unauthorized
  - Email de notificação enviado para merchant (security alert)
  - Frontend refetch `/api/api-keys/list`
- **Nota:** Não existe "Enable" action. Se merchant precisa reativar, deve criar nova key.
- **Refetch após sucesso:** Sim - Categoria C

**Detalhes sobre "Regenerar API key":**
- **Requer MFA:** Sim
- **Use case:** Credential rotation (merchant suspeita de leak, quer trocar key por segurança)
- **Validações backend esperadas:**
  - `api_key_id` existe e pertence ao merchant
  - Key status = `active` (não pode regenerar waiting_approval ou disabled)
  - User tem role ∈ {Admin, Developer}
- **Comportamento pós-sucesso:**
  - Backend gera nova key (novo random 32 chars)
  - Old key é disabled imediatamente (não funciona mais)
  - New key herda name, environment, permissions, ip_whitelist, webhook_url da old key
  - Webhook secret TAMBÉM é regenerado (security best practice)
  - Response retorna **new full key UMA VEZ** (merchant deve copiar agora)
  - Frontend mostra banner: "⚠️ Old key disabled. Update your integration with new key NOW."
  - Email urgente enviado (security alert: credential rotated)
  - Frontend refetch `/api/api-keys/list`
- **Crítico:** Zero downtime rotation não é possível (old key disabled instant). Merchant deve atualizar sistemas rapidamente.
- **Refetch após sucesso:** Sim - Categoria C

**Detalhes sobre "Atualizar permissões":**
- **Requer MFA:** Sim
- **Use case:** Merchant quer reduzir escopo de uma key (principle of least privilege)
- **Validações backend esperadas:**
  - `api_key_id` existe e pertence ao merchant
  - Key status = `active` (não pode update waiting_approval ou disabled)
  - `permissions` array não-vazio, cada permission válida
  - User tem role ∈ {Admin, Developer}
- **Comportamento pós-sucesso:**
  - Permissions da key são substituídas (não merge, replace)
  - Requests usando esta key com nova permissão INSUFICIENTE falham com 403 Forbidden
  - Email de notificação enviado (security change)
  - Frontend refetch `/api/api-keys/list`
- **Best practice:** Merchant deve testar nova permission scope em staging antes de aplicar em production key
- **Refetch após sucesso:** Sim - Categoria C

**Detalhes sobre "Atualizar IP whitelist":**
- **Requer MFA:** Sim
- **Use case:** Merchant mudou servidor, precisa adicionar novo IP
- **Validações backend esperadas:**
  - `api_key_id` existe e pertence ao merchant
  - Key status = `active`
  - `ip_whitelist` array de IPs ou CIDRs válidos (validar formato)
  - Max 50 IPs por key (prevent abuse)
  - User tem role ∈ {Admin, Developer}
- **Comportamento pós-sucesso:**
  - IP whitelist é substituída (replace, não append)
  - Requests de IPs NÃO na nova whitelist falham com 403 Forbidden imediatamente
  - Email de notificação enviado (security change)
  - Frontend refetch `/api/api-keys/list`
- **Warning:** Se merchant acidentalmente remove seu próprio IP, key para de funcionar (must add back)
- **Refetch após sucesso:** Sim - Categoria C

**Detalhes sobre "Atualizar webhook URL":**
- **Requer MFA:** Sim
- **Use case:** Merchant mudou endpoint de webhook, precisa atualizar
- **Validações backend esperadas:**
  - `api_key_id` existe e pertence ao merchant
  - Key status = `active`
  - `webhook_url` HTTPS obrigatório (não aceita HTTP por segurança)
  - URL válida e acessível (backend pode fazer test ping)
  - User tem role ∈ {Admin, Developer}
- **Comportamento pós-sucesso:**
  - Webhook URL atualizada
  - **Webhook secret é REGENERADO** (security: novo endpoint = novo secret)
  - Email de notificação com novo webhook secret enviado
  - Frontend refetch `/api/api-keys/list`
- **Nota:** Merchant deve atualizar validação de webhook signature com novo secret
- **Refetch após sucesso:** Sim - Categoria C

---

## Guia interno do produto

### Quando usar
Merchant/Developer acessa API Integration quando:
1. **Setup inicial:** Criar primeira API key para integração
2. **Desenvolvimento:** Criar staging/dev keys para testar integração
3. **Segurança:** Desabilitar key comprometida ou regenerar por precaução
4. **Rotação de credenciais:** Trocar keys periodicamente (best practice: every 90 days)
5. **Troubleshooting:** Verificar status de key (ativa? waiting approval? disabled?)
6. **Documentação:** Acessar code reference, implementation guides, webhooks
7. **Permissões:** Atualizar escopo de uma key (reduzir permissões)
8. **IP whitelist:** Adicionar/remover IPs permitidos
9. **Webhook config:** Atualizar URL de webhook

### Dependências
- **MFA:** Merchant DEVE ter MFA ativo para criar/modificar API keys (security requirement)
- **Crossramp Ops approval:** Novas keys ficam em `waiting_approval` até Ops aprovar manualmente
- **Templates:** API keys usam templates para criar checkouts via API
- **Webhooks:** API keys têm webhook URL/secret vinculado (notificações de eventos)
- **Rate limiting:** Cada key tem rate limit (previne abuse)
- **Auth0 RBAC:** Apenas Admin e Developer podem gerenciar API keys

### Lifecycle de uma API key

#### 1. **Created → Waiting Approval**
**O que acontece:**
- Developer cria nova key via UI
- MFA verificado
- Key gerada com status `waiting_approval`
- Full key mostrada UMA VEZ (merchant copia)
- Email enviado para merchant (confirmação) + Ops (approval needed)

**Duração típica:** 1-24 horas (depende de Ops)

**O que merchant pode fazer:**
- Ver key na lista (masked)
- Copiar full key do email de confirmação (se salvou)
- Aguardar approval

**O que merchant NÃO pode fazer:**
- Usar key para fazer API calls (retorna 401 Unauthorized: "API key pending approval")

#### 2. **Approved → Active**
**O que acontece:**
- Crossramp Ops aprova key manualmente (via admin panel)
- Key status muda para `active`
- Email enviado para merchant: "Your API key is now active"

**Duração:** Indefinida (enquanto key não for disabled ou merchant não deletar conta)

**O que merchant pode fazer:**
- Usar key para fazer API calls (autenticação funciona)
- Ver usage stats (requests, errors, rate limit)
- Desabilitar key se necessário
- Regenerar key (rotate credentials)
- Atualizar permissões/IP whitelist/webhook URL

#### 3. **Disabled**
**O que acontece:**
- Merchant ou Ops desabilita key
- Status muda para `disabled`
- Todos API calls usando esta key falham com 401 Unauthorized
- Email enviado (security alert)

**Duração:** Permanente (não pode reativar)

**O que merchant pode fazer:**
- Ver key na lista (como histórico)
- Ver when/why foi disabled (audit trail)

**O que merchant NÃO pode fazer:**
- Usar key (disabled permanentemente)
- Reativar key (must create new one)

### Diferença entre environments

| Environment | Prefix | Use Case | Rate Limit Default | Sandbox? |
|-------------|--------|----------|-------------------|----------|
| **Production** | `pk_live_` | Real transactions, real money | 1000 req/h | ❌ (real blockchain) |
| **Staging** | `pk_test_` | Testing integration, pre-production | 500 req/h | ✅ (testnet blockchain) |
| **Development** | `pk_dev_` | Local development, sandbox | 100 req/h | ✅ (mock blockchain) |

**Best practices:**
- **NÃO usar production key em staging/dev** (security risk)
- **Criar keys separadas** para cada environment
- **Production key:** IP whitelist obrigatório (extra security)
- **Staging/Dev keys:** IP whitelist opcional (convenience)

### Permissions explicadas

Permissions seguem formato `<action>:<resource>`.

| Permission | Permite | Exemplos de Endpoints | Risco |
|------------|---------|----------------------|-------|
| **read:payments** | Ver payments/transactions | `GET /v1/payments/list`, `GET /v1/payments/{id}` | Baixo |
| **write:payments** | Criar checkouts/payments | `POST /v1/payments/create`, `POST /v1/checkouts/create` | Médio |
| **read:balances** | Ver saldos de contas | `GET /v1/balances`, `GET /v1/accounts/list` | Baixo |
| **write:withdrawals** | Solicitar withdrawals | `POST /v1/withdrawals/request` | **ALTO** |
| **read:templates** | Listar templates | `GET /v1/templates/list` | Baixo |
| **write:templates** | Criar/editar templates | `POST /v1/templates/create`, `PATCH /v1/templates/{id}` | Médio |
| **read:webhooks** | Ver logs de webhooks | `GET /v1/webhooks/logs` | Baixo |
| **write:webhooks** | Configurar webhooks | `POST /v1/webhooks/configure` | Médio |
| **read:disputes** | Ver disputes | `GET /v1/disputes/list` | Baixo |
| **write:disputes** | Resolver disputes | `POST /v1/disputes/{id}/resolve` | **ALTO** |
| **admin:*** | Acesso total a TUDO | Qualquer endpoint | **CRÍTICO** |

**Principle of Least Privilege:**
- Key deve ter APENAS permissões necessárias
- Exemplo: E-commerce só cria checkouts → `write:payments` + `read:payments` (suficiente)
- Exemplo: Dashboard read-only → `read:payments` + `read:balances` (sem write)
- **NUNCA usar `admin:*` em production** (too dangerous)

### Campos principais explicados

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| **id** | API Key ID único | `apk_001` |
| **name** | Nome descritivo da key | "Production API", "Staging E-commerce" |
| **key_prefix** | Prefixo identifica environment | `pk_live_`, `pk_test_`, `pk_dev_` |
| **key_masked** | Key mascarada (segurança) | `pk_live_••••••••••••••••1234` |
| **key_last_4** | Últimos 4 chars (identificação) | `1234` |
| **key_full** | Key completa (mostrada UMA VEZ ao criar) | `pk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| **status** | Estado atual | `waiting_approval`, `active`, `disabled` |
| **created_at** | Data de criação | `2024-01-15T10:00:00Z` |
| **created_by** | Quem criou | `admin@company.com` |
| **last_used_at** | Última vez que key foi usada | `2025-12-22T10:30:00Z` (null se nunca usada) |
| **environment** | Ambiente | `production`, `staging`, `development` |
| **permissions** | Permissões granulares | `["read:payments", "write:payments"]` |
| **ip_whitelist** | IPs permitidos (opcional) | `["203.0.113.0/24", "198.51.100.45"]` |
| **rate_limit** | Limite de requests/hora | `1000` |
| **webhook_url** | URL para receber webhooks | `https://merchant.com/webhooks/crossramp` |
| **webhook_secret** | Secret para validar webhooks | `whsec_q7r8s9t0u1v2w3x4y5z6a7b8c9d0` |

### Casos extremos

#### 1. Merchant perdeu a full key após criar
**Cenário:** Merchant criou key, fechou banner sem copiar, agora precisa da full key.  
**Problema:** Full key NÃO pode ser recuperada (security: backend não armazena plaintext).  
**Solução:**
1. Se key ainda `waiting_approval`: Delete e crie nova
2. Se key `active` e em uso: Regenerar key (rotate credentials)
3. **Prevenção:** Email de confirmação DEVERIA conter full key (fallback)

#### 2. Key criada mas ficou em waiting_approval por >7 dias
**Cenário:** Ops esqueceu de aprovar key, merchant está bloqueado.  
**Ação:**
1. Merchant deve contactar Crossramp Ops (via support)
2. Ops aprova manualmente via admin panel
3. **Escalation:** Se Ops não responde em 24h, escalar para manager

**Timeline normal:** Approval em 1-24h. Se >48h = anormal.

#### 3. API calls retornando 401 mesmo com key ativa
**Causas possíveis:**
1. **Key desabilitada** (verificar status na tabela)
2. **IP não whitelisted** (request vindo de IP não autorizado)
3. **Key format errado** (merchant esqueceu `pk_live_` prefix ou typo)
4. **Header format errado** (deve ser `Authorization: Bearer pk_live_...`)
5. **Rate limit atingido** (too many requests, aguardar reset)

**Troubleshooting:**
1. Ver usage stats → Error breakdown (qual erro código?)
2. Se 401 "Unauthorized" → Key inválida ou disabled
3. Se 403 "Forbidden" → IP whitelist ou permission insuficiente
4. Se 429 "Rate limit" → Aguardar ou pedir aumento de limit

#### 4. Regenerar key quebrou integração
**Cenário:** Merchant regenerou key mas esqueceu de atualizar sistemas imediatamente.  
**Resultado:** Todos API calls falham (old key disabled).  
**Solução urgente:**
1. Merchant deve pegar new key do email/banner
2. Atualizar environment variables de TODOS sistemas (prod, staging, cron jobs, etc.)
3. Deploy/restart sistemas
4. **Timeline crítica:** <1 hour downtime é aceitável, >4h = problema grave

**Prevenção:** Merchant deveria ter staging key separada para testar rotation flow.

#### 5. Merchant tem 10 keys ativas (limit atingido)
**Cenário:** Merchant tenta criar 11ª key, backend retorna 400 "Maximum API keys reached".  
**Solução:**
1. Merchant deve desabilitar keys antigas/não usadas
2. Verificar `last_used_at` → Keys com null ou >90 days = boas candidatas para disable
3. Após desabilitar, tentar criar nova key
4. **Exception:** Enterprise merchants podem ter limit maior (contatar sales)

#### 6. Webhook secret regenerado, webhooks pararam de funcionar
**Cenário:** Merchant atualizou webhook URL, secret foi regenerado, agora webhooks falham signature validation.  
**Problema:** Merchant não atualizou código de validação com novo secret.  
**Solução:**
1. Pegar novo `webhook_secret` do email ou via API details
2. Atualizar código de validação:
   ```javascript
   const signature = req.headers['x-crossramp-signature'];
   const expectedSignature = crypto
     .createHmac('sha256', NEW_WEBHOOK_SECRET) // ← Update aqui
     .update(JSON.stringify(req.body))
     .digest('hex');
   if (signature !== expectedSignature) {
     return res.status(401).send('Invalid signature');
   }
   ```
3. Deploy novo código

**Timeline:** Webhooks ficam falhando até merchant atualizar secret (pode perder eventos).

#### 7. Production key sendo usada em staging (security breach)
**Cenário:** Developer acidentalmente commitou production key no Git, staging está usando pk_live_.  
**RISCO CRÍTICO:** Staging pode criar payments REAIS (real money), logs expõem production data.  
**Ação imediata:**
1. **Desabilitar production key AGORA** (stop the bleeding)
2. Criar nova production key (rotate credentials)
3. Remover key do Git history (`git filter-branch` ou BFG)
4. Criar staging key separada (`pk_test_`)
5. Atualizar staging para usar pk_test_
6. **Post-mortem:** Implementar pre-commit hook (detect API keys, block commit)

#### 8. IP whitelist bloqueou merchant do próprio sistema
**Cenário:** Merchant configurou IP whitelist com IP do servidor. Mas servidor mudou IP (cloud auto-scaling). Agora key não funciona.  
**Problema:** Requests vindo de novo IP são blocked (403 Forbidden).  
**Solução:**
1. Merchant acessa UI de outro IP (ex: home internet)
2. Atualiza IP whitelist para incluir novo IP
3. Sistema volta a funcionar
4. **Prevenção:** Usar CIDR blocks (ex: `203.0.113.0/24`) ao invés de IPs individuais (permite range)

### Notas para Ops/CS

#### Troubleshooting comum

**"Criei API key mas ela não funciona"**
- **Verificar:**
  1. Status da key → Se `waiting_approval`, explicar que Ops precisa aprovar
  2. Environment → Production key (`pk_live_`) só funciona em prod (não em sandbox)
  3. Header format → `Authorization: Bearer pk_live_...` (comum esquecer "Bearer")
- **Solução:** Se waiting_approval, escalar para Ops aprovar

**"Minha key sumiu da lista"**
- **Causa:** Merchant estava vendo lista filtrada (ex: apenas active)
- **Solução:** Remover filtros, mostrar all keys (incluindo disabled)
- **Edge case:** Se key realmente sumiu, pode ser bug (escalar para dev team)

**"Quero reativar uma key disabled"**
- **Explicar:** Não é possível reativar (security design)
- **Solução:** Criar nova key (merchant deve trocar em seus sistemas)
- **Rationale:** Disabled = compromised/obsolete, não deve voltar

**"Requests estão dando rate limit"**
- **Investigar:**
  1. Ver usage stats → Quantos requests nas últimas 24h?
  2. Rate limit da key → 1000 req/h é suficiente?
  3. Spike anormal → DDoS? Loop infinito no código?
- **Soluções:**
  1. Short-term: Aguardar reset (rate limit é por hora)
  2. Long-term: Pedir aumento de rate limit (Enterprise plan)
  3. Optimize: Merchant deve cachear responses (reduzir requests)

**"Webhooks não estão chegando"**
- **Checklist:**
  1. Webhook URL configurada? (ver detalhes da key)
  2. URL acessível? (fazer curl test)
  3. HTTPS? (HTTP não é aceito)
  4. Signature validation correta? (usar webhook secret certo)
  5. Timeout? (webhook endpoint deve responder <5s)
- **Debug:** Ver webhook logs (se endpoint disponível) → O que backend está enviando?

**"Perdi minha API key, preciso recuperar"**
- **Explicar:** Full key NÃO pode ser recuperada (security)
- **Soluções:**
  1. Se key não está em uso: Delete e crie nova
  2. Se key está em uso: Regenerar (rotate credentials)
- **Importante:** Merchant DEVE salvar key em password manager após criar

### Melhorias futuras

1. **Key rotation scheduler:** Auto-rotate keys a cada 90 days (send reminder email antes)
2. **Usage analytics dashboard:** Gráfico de requests over time, breakdown por endpoint, error rate
3. **Webhook testing tool:** Botão "Send test webhook" para testar endpoint
4. **API playground:** Sandbox interativo para testar API calls (Postman-like)
5. **Key templates:** Pre-configured permission sets (ex: "E-commerce", "Read-only dashboard")
6. **Multi-user approval:** Require 2 admins para aprovar production keys (dual control)
7. **Audit logs:** Ver histórico de todas actions em keys (created, disabled, permissions changed)
8. **IP auto-whitelist:** Detectar IP do request atual e sugerir adicionar ao whitelist
9. **Rate limit burst:** Permitir burst temporário (ex: 2000 req em 5 min, depois throttle)
10. **Webhook retry config:** Configurar retry policy (quantas vezes, backoff exponencial)
11. **Key expiration:** Keys com TTL (ex: expires in 1 year, must renew)
12. **Scoped keys:** Keys limitadas a specific templates ou accounts (extra granularity)
13. **OAuth 2.0 support:** Além de API keys, suportar OAuth flow (more secure)
14. **Webhook event filtering:** Merchant escolhe quais eventos quer receber (ex: apenas payment.completed)
15. **Real-time rate limit dashboard:** Ver current rate limit usage (ex: 847/1000 remaining)

### Best practices para compartilhar com merchants

1. **Never commit API keys to Git:** Use environment variables (`.env` file, gitignored)
2. **Rotate credentials every 90 days:** Security best practice (prevent long-term compromise)
3. **Use separate keys per environment:** Production, staging, development (isolate risk)
4. **Enable IP whitelist for production:** Extra security layer (prevent stolen key usage)
5. **Principle of least privilege:** Key should have ONLY necessary permissions
6. **Save key immediately:** Full key shown ONCE, save in password manager NOW
7. **Monitor usage stats:** Check for anomalies (sudden spike = potential breach)
8. **Test in staging first:** Before deploying to production, test integration in staging
9. **Validate webhook signatures:** ALWAYS verify webhooks (prevent spoofing)
10. **Set up alerting:** Get notified when key disabled, rate limit hit, or unusual activity

### Security considerations

**For Crossramp Ops:**
- **Approval process:** Manually review NEW keys before approving (check merchant legitimacy)
- **Anomaly detection:** Monitor for keys with unusual usage patterns (potential breach)
- **Revocation:** If key compromised, disable IMMEDIATELY (don't wait for merchant)
- **Rate limiting:** Protect backend from abuse (DDoS prevention)
- **Webhook validation:** Teach merchants to ALWAYS validate signatures (prevent fraud)

**For Merchants:**
- **Storage:** API keys are passwords (treat with same security)
- **Exposure:** If key leaked (Git, logs, public), disable and rotate ASAP
- **HTTPS only:** Never send API key over HTTP (man-in-the-middle risk)
- **Server-side only:** Don't use API keys in frontend JavaScript (exposed to users)
- **Logging:** Don't log full API keys (sanitize logs, show only last 4 chars)
