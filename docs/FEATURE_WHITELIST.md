# Feature Documentation: Whitelist Management

**Componente de View:** `/src/app/views/WhitelistView.tsx`  
**Componentes de Form:** 
- `/src/app/components/admin/WhitelistGroupForm.tsx`
- `/src/app/components/admin/WhitelistForm.tsx`
- `/src/app/components/admin/PIXWhitelistForm.tsx`

**ID de Rota/Navegação:** `whitelist`  
**Status:** ✅ **IMPLEMENTADO** - UI completa + Queries integradas + Mock data funcional

## Estado Atual da Implementação (Dezembro 2024)

### ✅ Implementado
- ✅ Two-tab layout (PIX Keys + Crypto Wallets)
- ✅ WhitelistView com tabs gerenciados via state
- ✅ PIX Keys tab: Lista flat com max 5 keys, badge de progresso
- ✅ Crypto Wallets tab: Grupos colapsáveis com addresses
- ✅ Warning banner para PIX ownership
- ✅ Info banner explicando workflow (Step 1/Step 2)
- ✅ Botões "Add" com Lock icon (MFA required)
- ✅ Status badges (active/pending/rejected)
- ✅ Empty states para ambos os tabs
- ✅ Collapsible groups com chevron icons
- ✅ **Queries de API implementadas em `/src/app/lib/queries.ts`:**
  - ✅ `queryWhitelistGroups()` - GET `/api/whitelist/groups`
  - ✅ `queryPIXKeys()` - GET `/api/whitelist/pix-keys`
- ✅ **Integração com useQuery hook:**
  - ✅ Loading states (skeleton loaders para grupos e PIX keys)
  - ✅ Error states (error messages + retry button)
  - ✅ Empty states (motivational copy)
  - ✅ Categoria B: Load once quando abre tab (enabled: activeTab === 'crypto'/'pix')
  - ✅ Refetch após criar grupo/adicionar address/adicionar PIX key
- ✅ **UX Enhancements:**
  - ✅ Tab switching com lazy loading (só carrega dados do tab ativo)
  - ✅ Disable "Add PIX Key" button quando limite de 5 atingido
  - ✅ Group com 0 addresses mostra empty state ao expandir
  - ✅ Responsive tables com overflow-auto

### ✅ Modo Mock Ativo
- **Mock data generators** em queries.ts fornecem dados realistas
- 3 whitelist groups: "Treasury Wallets" (3 addresses), "Partner Settlements" (1 address), "Cold Storage" (0 addresses)
- 2 PIX keys (Email, Phone) com status active/pending
- Network delays simulados (230-260ms)
- Total count e max_allowed retornados (2/5 PIX keys)

### ⚠️ Estado de Produção

| Componente | Status | Próximo Passo |
|------------|--------|---------------|
| **Frontend** | ✅ Completo | Pronto para produção |
| **Backend Bastion** | ⚠️ Pendente | Implementar adaptadores para `/api/whitelist/groups`, `/api/whitelist/pix-keys` |
| **Modo Mock** | ✅ Ativo | Desabilitar em produção via `config.js` |

## História de usuário

**Como** administrador do Crossramp,  
**Eu quero** gerenciar uma lista de endereços de carteira crypto e chaves PIX pré-aprovadas organizadas em grupos lógicos,  
**Para que** eu possa garantir que saques só sejam enviados para destinos seguros e auditados, reduzindo riscos de fraude e erros operacionais, enquanto mantenho flexibilidade para diferentes casos de uso (treasury, parceiros, cold storage, etc.).

## Notas de UX

- **Role-restricted:** Apenas Admin (`user_admin_crossramp`) pode acessar esta página
- **Two-tab layout:** Tab "PIX Keys" (lista simples, max 5) + Tab "Crypto Wallets" (grupos colapsáveis)
- **PIX Keys:**
  - Lista plana de até 5 chaves PIX
  - Cada PIX key tem: label, key value, type (Email/Phone/CPF/CNPJ/Random), status, reason, added date
  - Badge mostra "{count} of 5 PIX keys used"
  - Botão "Add PIX Key" desabilitado se já tiver 5 keys
  - Warning banner: "All PIX keys must be under the same ownership as your company registration"
- **Crypto Wallets:**
  - Organizados em "groups" (ex: "Treasury Wallets", "Partner Settlements", "Cold Storage")
  - Cada group tem: label, reason, created date, array de addresses
  - Groups são collapsible (expand/collapse com chevron)
  - Dentro de cada group: Table de addresses com currency, network, address (truncado), status, reason, added date
  - Cada group pode ter no máximo 1 address por combinação currency+network (USDT-TRX, USDC-ETH, etc.)
  - Info banner explica workflow: "Step 1: Create group → Step 2: Add addresses"
- **All actions require MFA:** Create group, add address, add PIX key (Lock icon nos botões)
- **Status badges:** "active" (green) ou "pending" (gray) - indica se endereço já foi aprovado
- **Progressive disclosure:** Groups começam collapsed (exceto primeiro); expandir para ver addresses
- **Smart filtering (crypto addresses only):**
  - Currency dropdown só mostra currencies que ainda têm networks disponíveis no group
  - Network dropdown filtra automaticamente networks já usados para a currency selecionada
  - Se USDT já tem addresses em TRX e ETH, só mostra SOL, AVAX, TON como opções
  - Se uma currency tem todos os networks usados (ex: USDC já tem ETH e SOL), essa currency não aparece no dropdown
  - Badge mostra progresso: "USDT (2/5 used)" - quantos networks foram usados
  - Info banner aparece se alguma currency foi ocultada: "Some currencies are hidden because all networks have been used"
  - Impossível selecionar combinação duplicada - prevenção no nível de UI
- **Empty states:**
  - Crypto: "No groups yet. Create your first group to start whitelisting addresses."
  - PIX: "No PIX keys whitelisted yet. Add your first PIX key to enable BRL withdrawals."
  - Group sem addresses: "No addresses in this group yet. Click Add Address to whitelist your first wallet."
- **Responsive:** Mobile-friendly com tables scrolláveis horizontal, labels adaptáveis

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter grupos de whitelist com endereços crypto** | `GET` | `/api/whitelist/groups` | Nenhum | `{ "groups": [{ "id": "group-1", "label": "Treasury Wallets", "reason": "Primary treasury management", "created_date": "2024-01-10", "addresses": [{ "id": "addr-1", "address": "0x742d35Cc...", "currency": "USDT", "network": "ETH", "status": "active", "reason": "Main ETH wallet", "added_date": "2024-01-15" }] }] }` | **B** (Categoria B - Carregar uma vez ao abrir tab Crypto) | Se falhar, mostrar empty state com mensagem "Unable to load whitelist groups. [Retry]" |
| **Obter chaves PIX whitelistadas** | `GET` | `/api/whitelist/pix` | Nenhum | `{ "pix_keys": [{ "id": "pix-1", "label": "Company Account", "pix_key": "company@bank.com", "type": "Email", "status": "active", "reason": "Primary company account", "added_date": "2024-01-10" }], "total_count": 2, "max_allowed": 5 }` | **B** (Categoria B - Carregar uma vez ao abrir tab PIX) | Se falhar, mostrar empty state com "Unable to load PIX keys. [Retry]" |

**Notas sobre classificação de queries:**
- **Whitelist groups (Categoria B):** Lista relativamente estática; só muda quando Admin cria grupo ou adiciona endereço. Carregar uma vez ao montar o componente. Se usuário adicionar address em outra aba/sessão, pode fazer refresh manual da página.
- **PIX keys (Categoria B):** Mesma lógica; lista não muda frequentemente. Max 5 keys então payload é pequeno. Carregar uma vez ao abrir tab PIX.

**Consideration for future:** Se sistema crescer e permitir mais de 5 groups ou 100+ addresses, considerar Categoria C (pagination/infinite scroll). Mas para limites atuais (5 PIX keys, ~5-10 groups esperados), Categoria B é ideal.

## Ações de escrita (commands)

| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| **Criar grupo de whitelist** | `POST` | `/api/whitelist/group/create` | `{ "label": "Treasury Wallets", "reason": "Primary treasury management wallets for holding company funds", "mfaCode": "123456", "userContext": {...} }` | Toast "Whitelist group created successfully" + Fechar dialog + Refetch groups list + Auto-expand novo group | ✓ |
| **Adicionar endereço crypto ao grupo** | `POST` | `/api/whitelist/address/add` | `{ "groupId": "group-1", "currency": "USDT", "network": "TRX", "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX", "reason": "Tron treasury for lower fees", "mfaCode": "123456", "userContext": {...} }` | Toast "Address added to whitelist. Status: pending approval" (se requer aprovação) OU "Address added successfully" (se auto-approve) + Fechar dialog + Refetch groups list | ✓ |
| **Adicionar chave PIX** | `POST` | `/api/whitelist/pix/add` | `{ "keyType": "email", "pixKey": "company@bank.com", "label": "Company Account", "reason": "Primary company account", "mfaCode": "123456", "userContext": {...} }` | Toast "PIX key added successfully. Status: pending approval" (se requer aprovação) OU "PIX key added and active" (se auto-approve) + Fechar dialog + Refetch PIX keys list | ✓ |

**Detalhes sobre "Criar grupo de whitelist":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `label` não pode estar vazio ou ser duplicado
  - `label` max 100 caracteres
  - `reason` não pode estar vazio, max 500 caracteres
  - User tem role = Admin
  - **Limite de grupos:** Max 5 grupos por merchant (opcional; banner menciona isso)
- **Comportamento pós-sucesso:**
  - Backend cria grupo com status "active" (grupos não requerem aprovação, são imediatos)
  - Frontend refetch `/api/whitelist/groups`
  - Novo grupo aparece na lista, automaticamente expandido
  - Dialog fecha
- **Refetch após sucesso:** Sim - Refetch `/api/whitelist/groups`

**Detalhes sobre "Adicionar endereço crypto ao grupo":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `groupId` existe e pertence ao merchant
  - `currency` ∈ {USDT, USDC} (no futuro pode expandir)
  - `network` válido para currency selecionada (USDT: TRX/SOL/ETH; USDC: ETH/SOL)
  - `address` formato válido para network (checksum para ETH, base58 para SOL/TRX)
  - **Validação crítica:** Combinação `currency + network` não existe no mesmo `groupId` (frontend já valida, backend deve rejeitar)
  - `reason` não vazio, max 500 caracteres
  - User tem role = Admin
- **Status inicial:** 
  - Se merchant tem KYC verificado + low risk → status = "active" (auto-approve)
  - Caso contrário → status = "pending" (requer aprovação manual do Crossramp compliance)
- **Comportamento pós-sucesso:**
  - Toast indica status: "Address whitelisted successfully" (se active) ou "Address submitted for approval" (se pending)
  - Refetch `/api/whitelist/groups`
  - Address aparece na table do group, expandido se estava collapsed
  - Dialog fecha
- **Refetch após sucesso:** Sim

**Detalhes sobre "Adicionar chave PIX":**
- **Requer MFA:** Sim
- **Validações backend esperadas:**
  - `keyType` ∈ {email, phone, cpf, cnpj, random}
  - `pixKey` formato válido para tipo:
    - Email: Validar RFC 5322 (regex padrão)
    - Phone: Formato brasileiro `+55 XX XXXXX-XXXX` ou `+55 XX XXXX-XXXX`
    - CPF: 11 dígitos com validação de checksum
    - CNPJ: 14 dígitos com validação de checksum
    - Random: Alfanumérico 32 caracteres (UUID style)
  - **Limite crítico:** Total de PIX keys ≤ 5 (frontend desabilita botão, backend deve rejeitar)
  - `pixKey` não duplicado (mesmo key já whitelistado)
  - `label` não vazio, max 100 caracteres
  - `reason` não vazio, max 500 caracteres
  - User tem role = Admin
- **Ownership validation:** Backend deve verificar se PIX key pertence ao mesmo CPF/CNPJ do merchant registration (pode ser async; status pending até validar)
- **Status inicial:**
  - Sempre "pending" até compliance validar ownership
  - Após validação: "active" (aprovado) ou "rejected" (não pertence ao merchant)
- **Comportamento pós-sucesso:**
  - Toast: "PIX key submitted for approval. We'll verify ownership and notify you."
  - Refetch `/api/whitelist/pix`
  - PIX key aparece na table com status "pending"
  - Dialog fecha
  - Badge atualiza: "{count} of 5 PIX keys used"
- **Refetch após sucesso:** Sim

## Guia interno do produto

### Quando usar
- **Setup inicial:** Novo merchant precisa whitelist endereços ANTES de fazer primeiro saque
- **Expansão de operações:** Adicionar novos wallets conforme negócio cresce (ex: novo parceiro = novo group "Partner X Settlements")
- **Compliance:** Manter lista auditável de todos os destinos aprovados para fins regulatórios
- **Segurança:** Prevenir saques acidentais ou fraudulentos para endereços não autorizados
- **Organização:** Separar wallets por finalidade (treasury, parceiros, cold storage, etc.)

### Casos de uso principais

#### 1. Whitelist para Crypto Withdrawals
**Workflow:**
1. Admin cria grupo "Treasury Wallets"
2. Adiciona USDT-TRX address (wallet principal Tron)
3. Adiciona USDT-ETH address (wallet secundário Ethereum)
4. Adiciona USDC-ETH address (mesmo wallet ETH, mas para USDC)
5. Ao fazer saque de USDT via Withdraw page → Dropdown mostra apenas wallets USDT do network selecionado

#### 2. Whitelist para PIX Withdrawals (BRL)
**Workflow:**
1. Admin adiciona chave PIX tipo "Email" com company@bank.com
2. Backend valida ownership (email registrado no banco sob mesmo CNPJ)
3. Status muda "pending" → "active" após 24-48h
4. Ao fazer saque BRL via Withdraw page → Dropdown "To PIX Address" mostra essa chave

#### 3. Múltiplos Parceiros
**Workflow:**
1. Criar grupo "Partner A - Acme Corp"
2. Adicionar USDC-ETH wallet do Partner A
3. Criar grupo "Partner B - Beta Inc"
4. Adicionar USDT-TRX wallet do Partner B
5. Ao fazer settlement com Partner A → Selecionar group e address específico

### Dependências

#### Withdraw Page
- **Dependência crítica total:** Withdraw page NÃO funciona sem whitelist
- Dropdown "To Wallet Address" busca de `/api/whitelist/wallets` (filtra por group+network)
- Dropdown "To PIX Address" busca de `/api/whitelist/pix` (apenas status=active)
- Se nenhum endereço whitelistado → Withdraw mostra "No whitelisted addresses. [Add to Whitelist →]"

#### KYC Status (Company Profile)
- Merchants com KYC verified podem ter auto-approve para addresses (status = "active" imediato)
- Merchants sem KYC ou high-risk sempre vão para "pending" (manual approval)
- Recommendation: Mostrar banner no topo da Whitelist page se KYC not verified: "Complete KYC verification to speed up whitelist approvals"

#### Compliance/Admin Backend
- Addresses e PIX keys com status "pending" aparecem em dashboard interno do Crossramp
- Compliance team review e aprova/rejeita manualmente
- Webhook/notification enviada ao merchant quando status muda (pending → active/rejected)

#### Audit Trail
- Todas as ações (create group, add address, add PIX) devem gerar log com:
  - User ID, role, timestamp
  - MFA code usado (não salvar, apenas validar)
  - IP address, user agent
  - Reason field (auditável)
- Logs ficam em sistema separado para compliance review

### Casos extremos

#### Limite de 5 PIX keys atingido
- **Cenário:** Merchant já tem 5 PIX keys, tenta adicionar 6ª
- **Frontend:** Botão "Add PIX Key" desabilitado com tooltip "Maximum 5 PIX keys reached. Remove one to add a new key."
- **Backend:** Retornar 400 "Maximum PIX key limit reached (5/5)"
- **Solução:** Merchant deve remover PIX key inativo antes de adicionar novo (future: Delete action)

#### Limite de 5 grupos atingido
- **Cenário:** Merchant tem 5 groups, tenta criar 6º
- **Frontend:** Botão "Create Group" desabilitado com tooltip "Maximum 5 groups reached"
- **Backend:** Retornar 400 "Maximum group limit reached"
- **Solução:** Merchant pode adicionar mais addresses em groups existentes (não precisa criar novo group para cada wallet)

#### Duplicate currency+network no mesmo group
- **Cenário:** Group "Treasury" já tem USDT-TRX, Admin tenta adicionar outro USDT-TRX
- **Frontend validation:** 
  - **NEW (improved UX):** Network dropdown não mostra TRX como opção se USDT-TRX já existe
  - Se USDT tem todos os 5 networks usados, USDT não aparece no currency dropdown
  - Impossível selecionar combinação duplicada - prevenção acontece no nível da UI
  - Admin vê mensagem: "All networks for USDT already have addresses in this group" se selecionar USDT com todos networks usados
- **Backend validation:** Se frontend contornado (via API direta), retornar 400 "Duplicate currency-network combination in group"
- **Reasoning:** Cada grupo só precisa de 1 endereço por currency-network (se precisar de segundo wallet USDT-TRX, criar outro group)

#### PIX key ownership validation falha
- **Cenário:** Merchant adiciona PIX email@bank.com, mas email não está registrado no banco sob CNPJ do merchant
- **Backend async job:** Valida ownership via API do banco ou manualmente
- **Se falhar:** Status = "rejected" + notification "PIX key rejected: Ownership could not be verified. Please use a key registered under your company CNPJ."
- **Frontend:** PIX key aparece na table com badge "rejected" (vermelho) + tooltip com reason
- **Solução:** Merchant deve usar PIX key correta ou entrar em contato com support

#### Address inválido para network
- **Cenário:** Admin cola endereço ETH em campo USDT-TRX
- **Frontend validation:** Não tem (seria complexo validar formato)
- **Backend validation:** 
  - TRX: Base58 começando com 'T', 34 caracteres
  - ETH: Hexadecimal começando com '0x', 42 caracteres (com checksum)
  - SOL: Base58, 32-44 caracteres
- **Se inválido:** Retornar 400 "Invalid address format for {network}"
- **Toast:** "Address validation failed: Format does not match {network} standard"

#### Group sem addresses
- **Cenário:** Admin cria grupo mas nunca adiciona addresses
- **UX:** Group aparece collapsed, ao expandir mostra empty state "No addresses in this group yet"
- **Permitido:** Sim, grupos vazios são válidos (Admin pode organizar antes de adicionar wallets)
- **Cleanup:** Backend pode ter job para deletar groups vazios após 30 dias de inatividade (opcional)

#### Nenhum endereço "active" (todos "pending")
- **Cenário:** Merchant adiciona 3 addresses, todos ficam "pending" aguardando aprovação
- **Withdraw page:** Dropdown mostra "No active whitelisted wallets. Addresses pending approval."
- **Não permite saque:** Botão "Submit" desabilitado até ter pelo menos 1 endereço ativo
- **Notification:** Email/push ao merchant: "Your withdrawal addresses are pending approval. You'll be notified once they're active."

#### MFA failure durante add address
- **Cenário:** Admin preenche form completo, MFA falha
- **Comportamento:** Modal fecha, dialog de Add Address permanece aberto com form preenchido
- **Permitir retry:** Admin pode clicar submit novamente sem re-preencher
- **Mensagem:** "MFA verification failed. Please try again."

#### Concurrent additions
- **Cenário:** Admin abre 2 tabs, em ambas tenta adicionar USDT-TRX ao mesmo group
- **Race condition:** Primeiro request cria address, segundo falha com 400 "Duplicate combination"
- **Frontend handling:** Após refetch, address aparece; segundo dialog mostra erro "This combination was recently added. Refreshing..."
- **Prevention:** Backend usa unique constraint em DB (group_id + currency + network)

#### PIX key format edge cases
- **Phone:** Aceitar com ou sem espaços/hífens: `+55 11 98765-4321` = `+5511987654321`
- **CPF/CNPJ:** Aceitar com ou sem pontos/hífens: `123.456.789-00` = `12345678900`
- **Backend:** Normalizar formato antes de salvar (remover caracteres especiais)
- **Display:** Sempre mostrar formatado na UI (adicionar pontos/hífens de volta)

### Melhorias futuras

#### Delete/Remove actions
- Botão "Remove" ao lado de cada address/PIX key (requer MFA)
- Soft delete: Marcar como "inactive" em vez de deletar (audit trail)
- Constraint: Não permitir delete se address está sendo usado em withdrawal "pending"

#### Edit labels e reasons
- Botão "Edit" inline na table
- Permitir atualizar apenas `label` e `reason` (não address/key em si)
- Não requer MFA (só metadata, não security-critical)

#### Bulk import
- Upload CSV com múltiplos addresses
- Formato: `groupLabel,currency,network,address,reason`
- Validação batch + preview antes de submit
- Um único MFA para aprovar batch inteiro

#### Group management
- Rename group (editar label/reason)
- Delete group (apenas se vazio ou mover addresses para outro group)
- Reorder groups (drag-and-drop)

#### Address verification
- Botão "Verify" ao lado de cada address
- Envia micro-transação (0.001 USDT) para confirmar que merchant controla o wallet
- Status: "pending" → "verifying" → "verified"
- Aumenta confiança do Crossramp em auto-approve

#### Advanced filters e search
- Search bar: Buscar por address, label, reason
- Filter por status: "active only", "pending only", "all"
- Filter por currency/network: "Show only USDT wallets"
- Sort by: Date added, alphabetical, status

#### Withdrawal history per address
- Click em address → Modal mostra histórico de withdrawals que usaram esse address
- Métricas: Total withdrawn, number of transactions, last used date
- Útil para audit: "Esse wallet foi usado 15 vezes, total de $50k USDT"

#### Notification preferences
- Toggle: "Notify me when whitelist address is approved/rejected"
- Email + Push notification quando status muda pending → active

#### Multi-approval workflow (enterprise)
- Criar address requer 2 Admins para aprovar (não apenas 1 MFA)
- Status: "pending_approval_1" → "pending_approval_2" → "active"
- UI: "1 of 2 approvals collected. Waiting for second Admin."

#### PIX key validation via API
- Integração com API do Banco Central (DICT - Diretório de Identificadores de Contas Transacionais)
- Validar ownership em tempo real durante add (não async)
- Se ownership confirmado → Auto-approve (status = "active" imediato)

#### Export whitelist
- Botão "Export to CSV" no topo da página
- Gera CSV com todos os groups, addresses, PIX keys
- Útil para compliance audits externos

#### Whitelist templates
- Preset groups: "Standard Treasury Setup" (USDT-TRX + USDC-ETH + PIX)
- Merchant pode aplicar template com um clique
- Ainda requer MFA para cada address individual

---

**Classificação final de queries:**
- Whitelist groups → **Categoria B** (load once per tab switch)
- PIX keys → **Categoria B** (load once per tab switch)

**Write actions:**
- Criar grupo → **Requer MFA** ✓
- Adicionar address crypto → **Requer MFA** ✓
- Adicionar PIX key → **Requer MFA** ✓

**Role access:**
- View completa: Admin apenas (`user_admin_crossramp`)
- Operations/Analyst/Developer: Sem acesso (sidebar item oculto)

**Critical dependencies:**
- Withdraw page (não funciona sem whitelist)
- KYC verification status (afeta auto-approve)
- Compliance backend (manual approval de pending addresses)

**Business constraints:**
- Max 5 PIX keys
- Max 5 groups (mencionado no banner)
- 1 address por currency+network por group
- PIX keys devem estar sob mesmo ownership (CNPJ) do merchant