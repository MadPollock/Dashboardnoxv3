# Feature Documentation: Withdraw

**Componente de View:** `/src/app/views/WithdrawView.tsx`  
**Componente de Form:** `/src/app/components/admin/WithdrawalRequestForm.tsx`  
**ID de Rota/Navegação:** `withdraw`  
**Status:** ✅ **IMPLEMENTADO** - UI completa + Queries integradas + Mock data funcional

## Estado Atual da Implementação (Dezembro 2024)

### ✅ Implementado
- ✅ Componente WithdrawView com warning banner (MFA obrigatório)
- ✅ WithdrawalRequestForm com form dinâmico
- ✅ Dropdowns condicionais: Account → Amount → Withdrawal Type → Wallet/PIX
- ✅ Network matching automático (filtra wallets por network)
- ✅ Conversão BRL (opção "Convert to BRL" para contas não-BRL)
- ✅ Endereço completo exibido abaixo do dropdown
- ✅ Note field opcional (max 500 chars)
- ✅ Restrição de role: Admin + Operations apenas
- ✅ **Queries de API implementadas em `/src/app/lib/queries.ts`:**
  - ✅ `queryBalances()` - GET `/api/balances`
  - ✅ `queryWhitelistedWallets()` - GET `/api/whitelist/wallets`
  - ✅ `queryWhitelistedPix()` - GET `/api/whitelist/pix`
- ✅ **Integração com useQuery hook:**
  - ✅ Loading states (skeleton loaders para dropdowns)
  - ✅ Error states (error messages + retry button)
  - ✅ Categoria A: Manual refresh para balances (botão "Refresh" ao lado do label)
  - ✅ Categoria B: Load once para wallets/PIX ao abrir página
  - ✅ Filtro de status: Apenas wallets/PIX "active" aparecem
- ✅ **UX Enhancements:**
  - ✅ Refresh button ao lado do Account dropdown
  - ✅ Empty states ("No accounts available", "No whitelisted wallets")
  - ✅ Critical error handling (se balances fail, disable form completamente)
  - ✅ Auto-reset wallet quando withdrawal type ou account muda
  - ✅ Refetch balances após withdrawal bem-sucedido

### ✅ Modo Mock Ativo
- **Mock data generators** em queries.ts fornecem dados realistas
- 7 accounts (USDT TRX/SOL/ETH, USDC SOL/ETH/Base, BRL PIX)
- 5 whitelisted wallets (ETH x2, TRX x1, SOL x2)
- 3 PIX addresses (Email, Phone, CNPJ)
- Network delays simulados (220-280ms)

### ⚠️ Estado de Produção

| Componente | Status | Próximo Passo |
|------------|--------|---------------|
| **Frontend** | ✅ Completo | Pronto para produção |
| **Backend Bastion** | ⚠️ Pendente | Implementar adaptadores para `/api/balances`, `/api/whitelist/wallets`, `/api/whitelist/pix` |
| **Modo Mock** | ✅ Ativo | Desabilitar em produção via `config.js` |

## História de usuário

**Como** administrador ou operador de tesouraria do Crossramp,  
**Eu quero** solicitar saques dos meus saldos em USDT/USDC/BRL para carteiras externas ou contas PIX pré-aprovadas, com opção de converter stablecoins para BRL automaticamente,  
**Para que** eu possa gerenciar liquidez, realizar settlements com parceiros, ou acessar fundos em moeda fiduciária sem precisar sair da plataforma.

## Notas de UX

- **Role-restricted:** Apenas Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) podem acessar esta página
- **Security-first:** Warning banner no topo reforça que MFA é obrigatório para todas as solicitações
- **Form dinâmico:** Campos e opções mudam baseados em seleções anteriores:
  - Selecionar account → Habilita campo Amount (mostra saldo disponível)
  - Selecionar account não-BRL → Mostra dropdown "Withdraw As" (same currency vs convert to BRL)
  - Alterar "Withdraw As" → Filtra lista de wallets/PIX addresses disponíveis
  - BRL accounts → Sem opção "Withdraw As", só PIX direto
- **Whitelist enforcement:** Só permite saques para endereços previamente whitelistados (security requirement)
- **Network matching:** Se "same currency", só mostra wallets do mesmo network (ex: USDT-TRX só pode ir para wallet TRX)
- **Conversão automática:** Opção "Convert to BRL" simplifica fluxo (backend faz conversão + PIX automaticamente)
- **Confirmação visual:** Endereço completo exibido abaixo do dropdown antes de submit
- **Progressive disclosure:** Note field é opcional, não obstrui fluxo principal
- **Error prevention:** Amount field desabilitado até selecionar account; Wallet field desabilitado até selecionar account
- **Balance display:** Cada account no dropdown mostra saldo atual; Amount field mostra "Available: X" abaixo

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Obter contas e saldos do usuário** | `GET` | `/api/balances` | Nenhum | `{ "accounts": [{ "id": "usdt-trx", "currency": "USDT", "network": "TRX", "balance": "12480.90" }, { "id": "usdc-eth", "currency": "USDC", "network": "ETH", "balance": "15680.00" }, { "id": "brl-pix", "currency": "BRL", "network": "PIX", "balance": "42890.50" }] }` | **A** (Categoria A - Refresh manual antes de withdrawal) | Se falhar, desabilitar form completamente e exibir erro "Unable to load accounts. Please refresh the page." |
| **Obter wallets whitelistadas** | `GET` | `/api/whitelist/wallets` | Nenhum | `{ "wallets": [{ "id": "wallet-1", "label": "Treasury Wallet", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "network": "ETH", "status": "active" }, { "id": "wallet-2", "label": "Operations Wallet", "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX", "network": "TRX", "status": "active" }] }` | **B** (Categoria B - Carregar uma vez ao abrir página) | Se falhar, mostrar dropdown vazio com mensagem "Unable to load whitelisted wallets. Please retry." |
| **Obter endereços PIX whitelistados** | `GET` | `/api/whitelist/pix` | Nenhum | `{ "pix_addresses": [{ "id": "pix-1", "label": "Company Account", "address": "company@bank.com", "type": "Email", "status": "active" }, { "id": "pix-2", "label": "Treasury PIX", "address": "+55 11 98765-4321", "type": "Phone", "status": "active" }, { "id": "pix-3", "label": "Operations PIX", "address": "12.345.678/0001-90", "type": "CNPJ", "status": "active" }] }` | **B** (Categoria B - Carregar uma vez ao abrir página) | Se falhar, mostrar dropdown vazio com mensagem "Unable to load PIX addresses. Please retry." |

**Notas sobre classificação de queries:**
- **Balances (Categoria A):** Dado crítico para decisão de saque; deve ser explicitamente atualizado pelo usuário antes de cada withdrawal para evitar overdraft. Mostrar timestamp "Last updated: 2 min ago" + botão "Refresh balances".
- **Whitelisted wallets/PIX (Categoria B):** Lista relativamente estática (só muda quando Admin adiciona/remove na página Whitelist); carregar uma vez ao montar o componente. Se usuário adicionar novo endereço em outra aba, pode fazer refresh manual da página.

## Ações de escrita (commands)

| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| **Submeter solicitação de saque** | `POST` | `/api/withdrawals/request` | `{ "account_id": "usdt-trx", "amount": "5000.00", "withdrawal_type": "same" \| "brl", "destination_id": "wallet-2" \| "pix-1", "note": "Settlement with partner ABC" (opcional) }` | Toast "Withdrawal request submitted successfully. Funds will be sent to [wallet label] after approval." + Limpar form + Opcional: Navegar para Transactions page | ✓ |

**Detalhes sobre "Submeter solicitação de saque":**
- **Requer MFA:** Sim - Modal de MFA aparece ao clicar "Submit (Requires MFA)"
- **Validações backend esperadas:**
  - `amount` <= saldo disponível no `account_id`
  - `amount` > 0 e até 2 casas decimais
  - `destination_id` existe e está ativo/whitelistado
  - Se `withdrawal_type === "same"`: `destination` network = `account` network
  - Se `withdrawal_type === "brl"`: `destination` deve ser PIX address válido
  - User tem permissão (role = Admin ou Operations)
- **Comportamento pós-sucesso:**
  - Backend cria registro de withdrawal com status "pending_approval" (se workflow de aprovação existir) ou "processing" (se auto-approve)
  - Toast exibe confirmação com resumo: "Withdrawal of 5,000 USDT to Treasury Wallet submitted. Track status in Transactions."
  - Form reseta para estado inicial (todos os campos limpos)
  - **Opcional:** Auto-navegar para Transactions page com filtro `type=withdrawal` aplicado
- **Refetch após sucesso:** Sim - Refetch `/api/balances` para atualizar saldo disponível (se usuário permanecer na página)

## Guia interno do produto

### Quando usar
- **Settlements com parceiros:** Enviar USDT/USDC para wallet de parceiro comercial após acumular pagamentos
- **Conversão para fiat:** Converter stablecoins acumulados em BRL e receber via PIX na conta bancária da empresa
- **Gerenciamento de liquidez:** Transferir fundos entre hot wallet (Crossramp) e cold storage
- **Distribuição de lucros:** Sacar BRL para conta dos sócios/investidores
- **Pagamentos a fornecedores:** Enviar crypto ou BRL para fornecedores que aceitam

### Dependências

#### Whitelist Management
- **Dependência crítica:** Esta página depende TOTALMENTE da existência de endereços whitelistados
- **Se nenhum wallet whitelistado:** Dropdown "To Wallet Address" mostra "No whitelisted wallets available" (disabled)
- **Se nenhum PIX whitelistado:** Dropdown "To PIX Address" mostra "No whitelisted PIX addresses available" (disabled)
- **UX recommendation:** Se usuário tenta usar Withdraw mas não tem wallets, mostrar helper text: "No withdrawal addresses configured. [Add to Whitelist →]" (link para Whitelist page)

#### Balances View
- Dados de saldo devem ser consistentes entre Balances view e Withdraw form
- Se discrepância, usuário pode confundir e tentar sacar mais que disponível
- Recommendation: Compartilhar mesma API `/api/balances` e cache strategy

#### Conversion rates (se applicable)
- Se withdrawal_type = "brl", backend precisa aplicar taxa de conversão atual (USDT → BRL ou USDC → BRL)
- Frontend pode opcionalmente mostrar preview: "~R$ 25,000 (rate: 1 USDT = R$ 5.00)" antes de submit
- **Future improvement:** Adicionar campo read-only "Estimated BRL amount" que atualiza em tempo real ao digitar Amount

#### Approval workflow (opcional)
- Sistema pode ter workflow de aprovação (ex: Operations solicita, Admin aprova)
- Neste caso, withdrawal fica "pending_approval" e Admin recebe notificação
- Se sem workflow, withdrawal vai direto para "processing" e backend executa automaticamente

### Casos extremos

#### Nenhuma conta disponível
- **Cenário:** Usuário é novo ou todas as contas têm saldo = 0
- **Comportamento:** Dropdown "From Account" mostra contas mesmo com R$ 0,00
- **UX:** Permitir seleção mas validar no submit ("Insufficient balance")
- **Alternativa:** Desabilitar contas com saldo 0 e mostrar tooltip "No balance available"

#### Nenhum endereço whitelistado
- **Cenário:** Admin acabou de criar empresa, ainda não adicionou wallets/PIX
- **Comportamento:** Dropdown "To Wallet/PIX" mostra mensagem "No whitelisted addresses available"
- **UX adicional:** Abaixo do dropdown, mostrar link: "You need to add withdrawal addresses first. [Go to Whitelist →]"
- **Não permitir submit:** Button "Submit" deve estar disabled se nenhum destination selecionável

#### Saldo insuficiente
- **Cenário:** Usuário digita amount > saldo disponível
- **Frontend validation:** Mostrar erro abaixo do campo Amount: "Insufficient balance. Available: R$ 1,000" (em vermelho)
- **Backend validation:** Retornar 400 "Insufficient balance" se validação frontend contornada
- **UX:** Não bloquear submit (deixar backend validar), mas mostrar warning visual

#### Network mismatch (withdrawal_type = "same")
- **Cenário:** Usuário seleciona USDT-TRX mas só tem wallets ETH/SOL whitelistados
- **Comportamento atual:** Dropdown filtra automaticamente (só mostra TRX wallets) → fica vazio se nenhum match
- **UX adicional:** Se filtro resulta em lista vazia, mostrar: "No TRX wallets whitelisted. [Add one →]"

#### BRL account selected
- **Cenário:** Usuário seleciona "BRL · PIX" como From Account
- **Comportamento:** Campo "Withdraw As" NÃO aparece (BRL só sai via PIX, não tem conversão)
- **Validação:** Garantir que dropdown "To Wallet" muda para "To PIX Address" automaticamente

#### Withdrawal type mudado após selecionar wallet
- **Cenário:** User seleciona USDT-TRX → "Same Currency" → Treasury Wallet TRX → Depois muda para "Convert to BRL"
- **Comportamento atual:** `useEffect` detecta mudança e reseta `selectedWallet` para vazio
- **UX:** Isso é correto (evita enviar para wallet errado), mas pode confundir usuário
- **Improvement:** Mostrar toast "Destination cleared because withdrawal type changed"

#### Note field muito longo
- **Frontend limit:** Não tem maxLength atualmente
- **Backend validation:** Deve limitar a ~500 caracteres
- **UX improvement:** Adicionar `maxLength={500}` e character counter: "0/500"

#### MFA failure
- **Cenário:** User cancela MFA modal ou código incorreto
- **Comportamento:** Modal fecha, form permanece preenchido (NÃO limpar)
- **UX:** Permitir usuário tentar novamente sem re-preencher tudo
- **Mensagem:** "MFA verification failed. Please try again."

#### API error após MFA
- **Cenário:** MFA passou mas `/api/withdrawals/request` retorna 500 ou erro de negócio
- **Comportamento:** Mostrar toast de erro com mensagem do backend
- **Não limpar form:** Deixar dados preenchidos para retry
- **Mensagens possíveis:**
  - "Withdrawal failed: Insufficient balance" (race condition - saldo mudou entre abrir form e submit)
  - "Withdrawal failed: Destination address is no longer active" (wallet foi removida do whitelist)
  - "Withdrawal failed: Daily withdrawal limit exceeded"

#### Concurrent withdrawals
- **Cenário:** User abre Withdraw em 2 tabs, faz 2 saques do mesmo account sem refresh
- **Problema:** Segundo saque pode falhar por saldo insuficiente (primeiro já consumiu)
- **Solução frontend:** Refetch balances após cada withdrawal bem-sucedido
- **Solução backend:** Validação transacional (lock no balance durante withdrawal)

#### Timezone considerations
- **Não aplicável diretamente a Withdraw**, mas se houver "daily withdrawal limits", timezone importa
- **Recommendation:** Backend deve usar timezone do merchant (configurado no profile)

### Melhorias futuras

#### Preview de conversão em tempo real
- Ao selecionar "Convert to BRL" e digitar amount, mostrar campo read-only:
  ```
  Amount: [5000] USDT
  ↓
  Estimated BRL: ~R$ 25,000 (rate: 1 USDT = R$ 5.00)
  Fee (2%): R$ 500
  Final amount: R$ 24,500
  ```
- Atualizar em tempo real conforme usuário digita (debounced API call para pegar taxa atual)

#### Withdrawal templates/favorites
- Permitir salvar combinações frequentes:
  - "Weekly settlement to Treasury" = USDT-TRX → Treasury Wallet
  - "Monthly PIX to bank" = USDC-SOL → Company Account PIX
- Dropdown "Load template" no topo do form pré-preenche todos os campos

#### Batch withdrawals
- Permitir selecionar múltiplos destinations e amounts de uma vez
- Upload CSV: "account,destination,amount,note"
- UX: Table com rows editáveis, submit all com um único MFA

#### Withdrawal limits e warnings
- Mostrar "Daily limit: R$ 50,000 (R$ 30,000 remaining)" abaixo do Amount field
- Warning se amount > 50% do saldo: "You're withdrawing more than half your balance. Are you sure?"
- Auto-calculate max withdrawable: Button "Max" ao lado do Amount input preenche com saldo total (ou limite diário, o que for menor)

#### Scheduled withdrawals
- Checkbox "Schedule for later"
- Date/time picker: "Execute withdrawal on: [date] at [time]"
- Backend cria withdrawal com status "scheduled", executa via cron job

#### Approval workflow UI
- Se withdrawal requer aprovação, mostrar status após submit:
  ```
  ✓ Withdrawal request submitted
  Status: Pending approval
  Requested: R$ 10,000 to Treasury Wallet
  Requested by: João Silva (Operations)
  Pending approval from: Admin team
  ```
- Email/push notification para Admins: "New withdrawal request awaiting approval"

#### Gas/network fee estimation (para crypto)
- Mostrar "Estimated network fee: ~$2.50 (TRX gas)" abaixo do Amount
- Frontend pode chamar `/api/estimate-gas?network=TRX&amount=5000` (cached por 60s)
- Deixar claro: "Network fee deducted from your account balance"

#### Withdrawal history integration
- Link no topo: "View recent withdrawals →" (navega para Transactions com filtro)
- Toast após submit: "Withdrawal submitted. [Track status →]" (link clicável)

#### PIX key validation
- Se backend retorna PIX keys, validar formato no frontend antes de permitir adicionar ao whitelist
- Email: `@` obrigatório
- Phone: Formato brasileiro `+55 XX XXXXX-XXXX`
- CPF/CNPJ: Validação de dígitos

#### Multi-signature support (enterprise feature)
- Withdrawals > X threshold requerem 2 Admins para aprovar
- UI mostra "Pending: 1 of 2 signatures collected"

---

**Classificação final de queries:**
- Balances → **Categoria A** (manual refresh, critical data)
- Whitelisted wallets/PIX → **Categoria B** (load once, relatively static)

**Write actions:**
- Submeter solicitação de saque → **Requer MFA** ✓

**Role access:**
- View completa: Admin + Operations apenas (`user_admin_crossramp`, `user_operations_crossramp`)
- Analyst/Developer: Sem acesso (sidebar item oculto)

**Critical dependencies:**
- Whitelist Management page (must have at least 1 whitelisted address to withdraw)
- Balances API (must be accurate and up-to-date)
- Conversion rate service (se withdrawal_type = "brl")