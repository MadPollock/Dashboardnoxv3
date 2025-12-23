# Feature Documentation: Templates

**Componente de View:** `/src/app/views/TemplatesView.tsx`  
**ID de Rota/Navegação:** `templates`  
**TypeScript Interfaces:** `/src/app/lib/queries.ts` (queries) + `/src/app/lib/commands.ts` (commands)

## História de usuário

**Como** administrador ou operador do Crossramp,  
**Eu quero** criar e gerenciar templates reutilizáveis de checkout de pagamento com configurações específicas de moeda, taxas e branding,  
**Para que** eu possa gerar experiências de pagamento consistentes para meus clientes sem reconfigurar ajustes toda vez, e oferecer diferentes experiências de checkout para diferentes casos de uso (ex: standard vs. premium, BRL vs. stablecoins, com ou sem revenue split).

## Notas de UX

- **Role-restricted:** Admin (`user_admin_crossramp`) e Operations (`user_operations_crossramp`) têm acesso completo; outros roles não veem esta página
- **All actions require MFA:** Create template, edit template, delete template, duplicate template (Lock icon nos botões)
- **Empty state:** Card com border-dashed, ícone de FileText, mensagem \"No templates yet. Create your first template to start accepting payments.\", botão de criar, link \"How templates work?\"
- **List view:** Cards horizontais com preview de configurações principais (color swatch, currency, fee behavior, split config)
- **Create/Edit via Sheet:** Side drawer que abre da direita, dividido em 3 seções com Separators:
  1. **Basics** - Template name, currency (currency disabled em edit mode)
  2. **Fees** - Customer pays fees (toggle), charge network fee (toggle), split payments (toggle + conditional fields)
  3. **Branding** - Button color (color picker), logo upload, \"Lite Mode\" toggle (show/hide \"Powered by Crossramp\")
- **Pagination:** 10 templates per page (expected usage: 3-5 templates típico, raramente mais de 10)
- **Collapsible explanation:** Banner \"How Templates Work\" acima da lista (collapsed por default, exceto em empty state)
- **Centralized currency config:** Dropdown mostra todas as 12 currencies de `/src/app/config/currencies.ts`:
  - Display: `pretty_name` (ex: \"USDT (TRX)\", \"BRL\", \"Bitcoin\")
  - Value: `currency_code` (ex: \"TRX_USDT_S2UZ\", \"BRL\", \"BTC\")
  - Backend recebe `currency_code` exato
- **Color picker:** Input type=\"color\" + hex text input lado a lado para flexibilidade
- **Logo upload:** Input type=\"file\" accept=\"image/png,image/jpeg,image/svg+xml\", max 2MB, frontend converte para base64 e envia via `logo_file_base64` field
- **Conditional split fields:** Quando \"Enable Split Payments\" toggle ativado, mostra 3 inputs adicionais (percentage + flat fee + destination address) com helper text baseado no network da currency selecionada
- **Tooltips em fees:** HelpCircle icons com tooltip explicando cada configuração de taxa
- **Three-dot menu:** MoreVertical dropdown com ações: Edit, Duplicate, Delete
- **Responsive:** Mobile tem layout vertical; desktop grid-cols-2 ou grid-cols-3 para cards de templates

## Ações de leitura (queries)

**TypeScript Interfaces:** `ListTemplatesRequest`, `ListTemplatesResponse`, `TemplateDetailsRequest`, `TemplateDetailsResponse`, `PaymentTemplate`

| Ação | Método | Endpoint | Query Parameters | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|------------------|------------------------------|-----------|---------------------|
| **Listar templates de pagamento** | `GET` | `/api/templates/list` | `?page=1&limit=10&sort_by=created_at&sort_order=desc` | `{ "templates": [{ "id": "tpl_8x7n2m9k", "name": "Standard Checkout", "currency_code": "BRL", "currency_display": "BRL", "network_display": null, "button_color": "#ff4c00", "logo_url": "https://cdn.crossramp.com/logos/merchant123.png", "fee_behavior": "customer_pays", "charge_network_fee_to_customer": false, "split_enabled": false, "split_percentage": null, "split_flat_fee": null, "split_destination_address": null, "show_powered_by": true, "created_at": "2025-01-10T14:32:00Z", "updated_at": "2025-01-10T14:32:00Z", "usage_count": 47 }], "pagination": { "current_page": 1, "total_pages": 1, "total_count": 2, "per_page": 10 } }` | **C** (Categoria C - Load once on page mount + after write actions) | Se falhar, mostrar empty state com \"Unable to load templates. [Retry]\" |
| **Obter detalhes do template** | `GET` | `/api/templates/details` | `?template_id=tpl_8x7n2m9k` | `{ "id": "tpl_8x7n2m9k", "name": "Standard Checkout", "currency_code": "BRL", "button_color": "#ff4c00", "logo_url": "https://cdn.crossramp.com/logos/...", "fee_behavior": "customer_pays", "charge_network_fee_to_customer": false, "split_enabled": false, "split_percentage": null, "split_flat_fee": null, "split_destination_address": null, "show_powered_by": true, "created_at": "2025-01-10T14:32:00Z", "updated_at": "2025-01-10T14:32:00Z", "usage_count": 47, "recent_payments": [{ "payment_id": "pay_abc123", "amount": 150.00, "currency_code": "BRL", "created_at": "2025-01-12T10:15:00Z" }] }` | **C** (Categoria C - Load on-demand quando Edit clicked) | Toast \"Failed to load template details\" + fechar edit sheet |

**Notas sobre classificação de queries:**
- **List templates (Categoria C):** Lista raramente muda (merchant cria 3-5 templates e mantém por meses). Carregar uma vez ao montar componente + refetch após create/edit/delete. Não precisa de polling automático.
- **Template details (Categoria C):** Load on-demand apenas quando usuário clica Edit em um template específico. Não carregar todos os detalhes upfront para economizar bandwidth.

## Ações de escrita (commands)

**TypeScript Interfaces:** `CreateTemplateCommand`, `UpdateTemplateCommand`, `DeleteTemplateCommand`, `DuplicateTemplateCommand`, `TemplateCommandResponse`

**IMPORTANTE - MFA Authentication:**  
Todos os commands abaixo requerem MFA. O código MFA transita **apenas no JWT token** via `Authorization` header após `loginWithPopup()`. **NÃO incluir `mfa_code` no payload JSON**.

| Ação | Método | Endpoint | Formato de Payload | Formato de Resposta de Sucesso | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|---------------------------------|--------------------|------------------|
| **Criar template** | `POST` | `/api/commands/templates/create` | `{ "name": "Standard Checkout", "currency_code": "BRL", "button_color": "#ff4c00", "logo_file_base64": "data:image/png;base64,iVBORw0KGg...", "fee_behavior": "customer_pays", "charge_network_fee_to_customer": false, "split_enabled": false, "split_percentage": null, "split_flat_fee": null, "split_destination_address": null, "show_powered_by": true }` | `{ "success": true, "template_id": "tpl_8x7n2m9k", "message": "Template created successfully" }` | Toast \"Template created successfully\" + Fechar sheet + Refetch templates list + Auto-scroll para novo template | ✓ |
| **Atualizar template** | `POST` | `/api/commands/templates/update` | `{ "template_id": "tpl_8x7n2m9k", "name": "Updated Name", "button_color": "#2563eb", "logo_file_base64": "data:image/png;base64,iVBORw0KGg...", "fee_behavior": "merchant_absorbs", "charge_network_fee_to_customer": true, "split_enabled": true, "split_percentage": 15.0, "split_flat_fee": 3.00, "split_destination_address": "TJA...", "show_powered_by": false }` | `{ "success": true, "template_id": "tpl_8x7n2m9k", "message": "Template updated successfully" }` | Toast \"Template updated successfully\" + Fechar sheet + Refetch templates list | ✓ |
| **Deletar template** | `POST` | `/api/commands/templates/delete` | `{ "template_id": "tpl_8x7n2m9k" }` | `{ "success": true, "message": "Template deleted successfully" }` | Toast \"Template deleted successfully\" + Fechar menu dropdown + Refetch templates list | ✓ |
| **Duplicar template** | `POST` | `/api/commands/templates/duplicate` | `{ "template_id": "tpl_8x7n2m9k", "new_name": "Standard Checkout (Copy)" }` | `{ "success": true, "template_id": "tpl_9y8o3n0l", "message": "Template duplicated successfully" }` | Toast \"Template duplicated successfully\" + Refetch templates list + Auto-scroll para template duplicado | ✓ |

**Detalhes sobre \"Criar template\":**
- **Requer MFA:** Sim - MFA code transita via JWT token em `Authorization` header (não no payload)
- **Logo upload workflow:**
  1. User seleciona arquivo via `<input type="file" accept="image/png,image/jpeg,image/svg+xml" />`
  2. Frontend valida: tamanho ≤ 2MB, formato ∈ {png, jpg, jpeg, svg}
  3. Frontend converte para base64: `const base64 = await fileToBase64(file)` → gera string `"data:image/png;base64,iVBORw0KGg..."`
  4. Frontend envia base64 string no campo `logo_file_base64`
  5. Backend: decode base64 → upload para S3 → retorna `logo_url` no response
  6. Nota: Se `logo_file_base64` for `null` ou omitido, template não terá logo (usar placeholder ou iniciais)
- **Validações backend esperadas:**
  - `name` obrigatório, max 100 chars, único por merchant
  - `currency_code` obrigatório, deve existir em `/config/currencies` (BRL, TRX_USDT_S2UZ, ETH_USDC_VUSD, etc.)
  - `button_color` obrigatório, formato hex válido (#RRGGBB)
  - `logo_file_base64` opcional, se fornecido: base64 válido, decode size ≤ 2MB, formato png/jpg/svg
  - `fee_behavior` enum ["customer_pays", "merchant_absorbs"]
  - `split_percentage` se split_enabled=true: obrigatório, range 0.01-99.99
  - `split_flat_fee` se split_enabled=true: opcional, decimal ≥ 0
  - `split_destination_address` se split_enabled=true: obrigatório, formato válido para network do `currency_code` (ex: TRC-20 se TRX_USDT_S2UZ)
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Template criado com status \"active\" (não requer aprovação)
  - Frontend refetch `/api/templates/list`
  - Sheet fecha
  - Auto-scroll para o novo template no topo da lista
- **Refetch após sucesso:** Sim - Refetch `/api/templates/list` (Categoria C: optimistic update + debounced refetch 500ms)

**Detalhes sobre \"Atualizar template\":**
- **Requer MFA:** Sim - MFA code transita via JWT token
- **Logo update workflow:**
  - Se user seleciona novo arquivo: mesma lógica de create (converte para base64, envia `logo_file_base64`)
  - Se user não altera logo: omitir `logo_file_base64` do payload (backend mantém logo atual)
  - Se user clica "Remove logo": enviar `logo_file_base64: null` (backend deleta logo do S3 e seta `logo_url: null`)
- **Validações backend esperadas:**
  - `template_id` existe e pertence ao merchant
  - `currency_code` é **imutável** - se incluído no payload, backend DEVE ignorar ou retornar erro 400 "Currency code cannot be changed"
  - Mesmas validações de create para outros campos (apenas campos fornecidos são atualizados - partial update)
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Template atualizado imediatamente
  - Frontend refetch `/api/templates/list`
  - Sheet fecha
  - Toast de sucesso
- **Nota importante:** Se template está em uso por payment links ativos, atualização afeta apenas novos pagamentos criados DEPOIS da edição (pagamentos em andamento mantêm config original)

**Detalhes sobre \"Deletar template\":**
- **Requer MFA:** Sim - MFA code transita via JWT token
- **Validações backend esperadas:**
  - `template_id` existe e pertence ao merchant
  - User tem role ∈ {Admin, Operations}
  - **Edge case crítico:** Se template está em uso (tem payment links ativos ou pagamentos pendentes), backend DEVE retornar erro
- **Comportamento com template em uso:**
  ```json
  {
    "success": false,
    "error_code": "TEMPLATE_IN_USE",
    "message": "Cannot delete template with 3 active payment links. Archive or reassign them first.",
    "metadata": {
      "active_payment_links": 3,
      "pending_payments": 0
    }
  }
  ```
  - Frontend mostra toast: \"Cannot delete template. It's being used by 3 active payment links. Please reassign or archive them first.\"
- **Comportamento pós-sucesso (se não em uso):**
  - Template soft-deleted (ou hard-deleted, dependendo de estratégia do backend)
  - Frontend refetch `/api/templates/list`
  - Dropdown menu fecha
  - Toast de sucesso

**Detalhes sobre \"Duplicar template\":**
- **Requer MFA:** Sim - MFA code transita via JWT token
- **Validações backend esperadas:**
  - `template_id` existe
  - `new_name` obrigatório, max 100 chars, único por merchant
  - User tem role ∈ {Admin, Operations}
- **Comportamento pós-sucesso:**
  - Cria cópia exata do template original com novo ID e novo nome
  - Todos os settings são copiados: currency, colors, fees, splits, branding (incluindo logo - backend copia arquivo do S3)
  - Frontend refetch `/api/templates/list`
  - Novo template aparece no topo da lista
  - Auto-scroll para template duplicado

## Currency Network Address Formats

Quando `split_enabled: true`, o campo `split_destination_address` deve ter formato válido para o network da currency selecionada:

| Currency Code | Network | Address Format | Validação Regex | Helper Text Example |
|---------------|---------|----------------|-----------------|---------------------|
| `TRX_USDT_S2UZ` | Tron (TRC-20) | Starts with `T`, 34 chars | `^T[A-Za-z0-9]{33}$` | \"Enter Tron address (starts with T, 34 characters)\" |
| `ETH_USDC_VUSD` | Ethereum (ERC-20) | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | \"Enter Ethereum address (starts with 0x, 42 characters)\" |
| `ETH_USDT_93F2` | Ethereum (ERC-20) | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | \"Enter Ethereum address (starts with 0x, 42 characters)\" |
| `MATIC_USDC_8KW1` | Polygon | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | \"Enter Polygon address (starts with 0x, 42 characters)\" |
| `MATIC_USDT_VL90` | Polygon | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | \"Enter Polygon address (starts with 0x, 42 characters)\" |
| `SOL_USDC_EPjF` | Solana | Base58, 32-44 chars | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` | \"Enter Solana address (Base58 format, 32-44 characters)\" |
| `BTC` | Bitcoin | Starts with `1`, `3`, or `bc1` | `^(1\|3\|bc1)[a-zA-Z0-9]{25,42}$` | \"Enter Bitcoin address (starts with 1, 3, or bc1)\" |
| `BRL` | N/A (PIX) | N/A | N/A | \"Splits not available for BRL (PIX does not support on-chain splits)\" |
| `EUR` | N/A (SEPA) | N/A | N/A | \"Splits not available for EUR (fiat currency)\" |
| `MXN` | N/A (SPEI) | N/A | N/A | \"Splits not available for MXN (fiat currency)\" |
| `ARS` | N/A | N/A | N/A | \"Splits not available for ARS (fiat currency)\" |
| `COP` | N/A | N/A | N/A | \"Splits not available for COP (fiat currency)\" |

**Frontend behavior:**
- Quando user seleciona currency que não suporta splits (BRL, EUR, MXN, ARS, COP), o toggle \"Enable Split Payments\" deve ser **disabled** com tooltip explicando \"Splits not supported for fiat currencies\"
- Quando user ativa splits e seleciona crypto currency, mostrar helper text dinâmico baseado no network (ver coluna \"Helper Text Example\")
- Validação client-side: validar formato do endereço via regex ANTES de submeter (mostrar erro inline \"Invalid {network} address format\")

## Guia interno do produto

### Quando usar
Merchant acessa Templates quando:
1. **Primeira configuração:** Após onboarding, criar primeiro template para começar a aceitar pagamentos
2. **Novo caso de uso:** Quer oferecer checkout diferente (ex: criar \"Premium\" com merchant absorbs fees + white-label)
3. **Multi-moeda:** Comerciante internacional cria templates separados para BRL (local) e USDT (cripto)
4. **Revenue sharing:** Marketplace precisa auto-split pagamentos para vendedores parceiros

### Dependências
- **Currency config:** `/src/app/config/currencies.ts` define as 12 moedas suportadas
- **Auth0 + RBAC:** Apenas Admin e Operations podem criar/editar templates
- **MFA:** Todos os write actions requerem step-up MFA via Auth0 (`loginWithPopup()`)
- **Payment Links:** Templates são usados ao criar payment links (dependência downstream)
- **S3 Upload:** Backend precisa upload de logos para S3/CDN (recebe base64, retorna `logo_url`)

### Casos extremos

#### 1. Template com currency_code inválido
**Cenário:** Merchant tenta criar template com `currency_code: "EUR"` mas EUR não existe em `/config/currencies`  
**Tratamento:**
- Frontend: Dropdown só mostra currencies de CURRENCIES array (impossível selecionar inválido)
- Backend validation: Se payload contém currency_code inexistente, retornar 400 "Invalid currency code"

#### 2. Split address incompatível com currency network
**Cenário:** Template usa `currency_code: "TRX_USDT_S2UZ"` (Tron) mas `split_destination_address` é endereço ETH (0x...)  
**Tratamento:**
- Frontend: Mostrar helper text \"Enter Tron address (starts with T, 34 characters)\" baseado em currency_code selecionada
- Frontend validation: Regex check ANTES de submit → mostrar erro \"Invalid Tron address format\"
- Backend validation: Validar que address format match network do currency_code. Se mismatch, retornar 400 "Address format invalid for selected network"

#### 3. Deletar template em uso
**Cenário:** Template \"Standard\" tem 5 payment links ativos. Admin tenta deletar.  
**Tratamento:**
- Backend retorna erro `TEMPLATE_IN_USE` com metadata
- Frontend mostra toast: \"Cannot delete template. It's being used by 5 active payment links. Please reassign or archive them first.\"
- **Solução para merchant:** Ir para Payments → filtrar por template → reassign payment links para outro template OU aguardar todos pagamentos serem completos/expirados

#### 4. Nome de template duplicado
**Cenário:** Merchant já tem template \"Standard Checkout\", tenta criar outro com mesmo nome  
**Tratamento:**
- Backend retorna 400 "Template name already exists"
- Frontend mostra toast: \"Template name already exists. Please choose a different name.\"

#### 5. Split percentage > 100%
**Cenário:** Merchant digita `split_percentage: 120.5`  
**Tratamento:**
- Frontend: Input type=\"number\" com validação client-side: min=0.01, max=99.99, step=0.01
- Backend validation: Se percentage < 0.01 ou > 99.99, retornar 400 "Split percentage must be between 0.01% and 99.99%"

#### 6. Logo upload muito grande
**Cenário:** Merchant tenta upload de logo 5MB (limite é 2MB)  
**Tratamento:**
- Frontend: Validação client-side no onChange do input file:
  ```typescript
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      e.target.value = ""; // Clear input
      return;
    }
    
    // Check format
    const validFormats = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!validFormats.includes(file.type)) {
      toast.error("Logo must be PNG, JPG, or SVG");
      e.target.value = "";
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => setLogoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };
  ```
- Backend validation: Se base64 decode > 2MB, retornar 400 "Logo file too large (max 2MB)"

#### 7. Currency_code é imutável após criação
**Cenário:** Template criado com BRL, depois merchant quer mudar para USDT via Edit  
**Tratamento:**
- Frontend: No edit sheet, currency field é **disabled** (read-only) com tooltip \"Currency cannot be changed after creation\"
- Backend validation: Se payload de update contém `currency_code`, retornar 400 "Currency code cannot be changed" (NÃO ignorar silenciosamente)
- **Solução para merchant:** Duplicar template → editar nome → currency já fica fixo da original. Se quiser currency diferente, criar novo template.

#### 8. Split payments em currency fiat (BRL, EUR, etc.)
**Cenário:** Merchant tenta ativar splits em template BRL  
**Tratamento:**
- Frontend: Toggle \"Enable Split Payments\" fica **disabled** quando currency ∈ {BRL, EUR, MXN, ARS, COP}
- Tooltip ao hover: \"Splits not supported for fiat currencies. Use crypto currencies (USDT, USDC, BTC) to enable revenue splitting.\"
- Backend validation: Se `split_enabled: true` mas currency é fiat, retornar 400 "Splits not supported for this currency"

### Notas para Ops/CS

#### O que são Templates?
Templates são **presets de configuração de checkout**. Em vez de configurar moeda, taxas e branding toda vez que cria um pagamento, merchant seleciona um template e todas configurações são aplicadas automaticamente.

**Analogia:** Templates são como \"receitas de bolo\" - você cria a receita uma vez (template), depois usa ela múltiplas vezes (payment links) sem reescrever os ingredientes.

#### Campos principais explicados

| Campo | O que faz | Exemplo |
|-------|-----------| --------|
| **Currency Code** | Moeda que o checkout aceita | `BRL`, `TRX_USDT_S2UZ` (USDT na rede Tron) |
| **Fee Behavior** | Quem paga a taxa de processamento do Crossramp | `customer_pays` = taxa adicionada ao total<br>`merchant_absorbs` = taxa deduzida do settlement |
| **Charge Network Fee** | Quem paga gas fee de blockchain (apenas crypto) | `true` = customer paga<br>`false` = merchant paga |
| **Split Enabled** | Auto-dividir pagamento para carteira parceira | 20% vai para afiliado, 80% para merchant |
| **Split Percentage** | Percentual do split | `15.0` = 15% |
| **Split Flat Fee** | Taxa fixa adicional do split (opcional) | `5.00` = $5 USDT extra para parceiro |
| **Split Destination** | Endereço crypto da carteira parceira | `TXYZPZUh...` (endereço TRC-20 para splits USDT-TRX) |
| **Button Color** | Cor hex do botão de checkout | `#ff4c00` (laranja Crossramp) |
| **Show Powered By** | Mostrar badge \"Powered by Crossramp\" | `true` = mostra badge<br>`false` = white-label |

#### Troubleshooting comum

**\"Não consigo deletar um template\"**
- **Motivo:** Template está sendo usado por payment links ativos
- **Solução:** 
  1. Ir para Payments → filtrar por este template
  2. Reassign todos payment links para outro template OU aguardar expirar
  3. Tentar deletar novamente

**\"Customer está confuso sobre taxas\"**
- **Motivo:** Template tem `fee_behavior: merchant_absorbs` mas merchant esperava customer pagar
- **Explicar:**
  - `customer_pays` = customer vê taxa adicionada no checkout (ex: produto R$100 + R$3 taxa = R$103 total)
  - `merchant_absorbs` = customer paga valor exato (R$100), merchant recebe R$97 (taxa deduzida)
- **Solução:** Editar template → trocar para `customer_pays`

**\"Split não está funcionando\"**
- **Verificar:**
  1. `split_enabled: true`?
  2. Currency suporta splits? (apenas crypto: USDT, USDC, BTC, SOL - fiat não suporta)
  3. `split_destination_address` é válido para o network do template?
     - Ex: Template usa `TRX_USDT_S2UZ` → endereço deve ser TRC-20 (começa com `T...`)
     - Se template usa `ETH_USDC_VUSD` → endereço deve ser ERC-20 (começa com `0x...`)

**\"Logo não aparece no checkout\"**
- **Verificar:**
  1. Formato: JPG, PNG ou SVG apenas
  2. Tamanho: Máximo 2MB
  3. Se logo_url está retornando 404 → problema de upload S3 (chamar DevOps)
  4. Clear cache do browser (às vezes mostra logo antiga)

**\"Quero mudar a moeda do template\"**
- **Não é possível:** `currency_code` é imutável após criação
- **Solução:** 
  1. Duplicar template existente
  2. Deletar template original (se não estiver em uso)
  3. Criar novo template com currency desejada
- **Motivo:** Mudar currency de template em uso quebraria payment links ativos

### Melhorias futuras

1. **Batch operations:** Selecionar múltiplos templates e deletar/editar em batch
2. **Template preview:** Mostrar preview visual do checkout page ao editar template (iframe ou modal)
3. **A/B testing:** Criar variants do mesmo template para testar conversion rates
4. **Template analytics:** Dashboard mostrando qual template gera mais conversão
5. **Template sharing:** Exportar/importar templates entre merchants (marketplace de templates)
6. **Conditional splits:** Splits dinâmicos baseados em valor do pagamento (ex: >$1000 = 15%, <$1000 = 10%)
7. **Multi-currency templates:** Template que aceita múltiplas currencies e deixa customer escolher
8. **Scheduled templates:** Templates que ativam/desativam automaticamente em datas específicas (ex: promoções Black Friday)
9. **Logo variants:** Upload multiple logo sizes (light/dark mode, mobile/desktop)
10. **Template versioning:** Manter histórico de mudanças com rollback capability

### Best practices para compartilhar com merchants

1. **Naming convention:** Use nomes descritivos como \"BRL - Customer Pays Fees\" em vez de \"Template 1\"
2. **Test first:** Criar template → testar com pagamento pequeno → verificar se checkout está correto
3. **Document splits:** Manter registro externo de qual parceiro recebe qual % (para contabilidade)
4. **Color accessibility:** Use cores de alto contraste no botão (evitar amarelo claro em fundo branco)
5. **Limit templates:** 3-5 templates é típico - muitos templates = confusão na hora de escolher
6. **Version naming:** Se atualizar template frequentemente, incluir versão no nome (ex: \"Standard v2\", \"Premium 2024\")
7. **Logo optimization:** Comprimir logos antes de upload (usar TinyPNG ou similar para reduzir tamanho)
8. **Split testing:** Sempre testar split address com transação pequena antes de usar em produção
