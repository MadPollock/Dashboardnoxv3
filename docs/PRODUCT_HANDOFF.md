# Documento de Handoff do Produto

**Projeto:** Crossramp Payments Dashboard  
**Versão:** 2.0  
**Última Atualização:** 23 de dezembro de 2024  
**Status:** Pronto para Integração & Revisão Técnica

---

## 1. Visão Geral do Epic

### O que é o produto
O Crossramp é uma aplicação dashboard web construída em React 18 e Tailwind CSS v4, projetada para facilitar operações de pagamento que conectam o sistema PIX brasileiro com stablecoins em blockchain. A aplicação segue uma filosofia de design wabi-sabi, priorizando simplicidade visual com cores quentes, tipografia Manrope/Geist, cards suaves sem bordas duras e divulgação progressiva de features avançadas.

A arquitetura frontend é uma SPA (Single Page Application) que se comunica exclusivamente via API REST com o backend, sem acesso direto a banco de dados. Autenticação e autorização são gerenciadas pelo Auth0 com tokens JWT RS256, e toda a interface suporta três idiomas (inglês, português, espanhol) através de um sistema centralizado de tradução.

### O que ele faz
O dashboard permite que comerciantes aceitem pagamentos em criptomoeda de clientes, convertam automaticamente para moeda fiduciária (BRL via PIX), e gerenciem todo o ciclo de vida dessas transações. A aplicação implementa CQRS estrito, onde todas operações de leitura (consultas de saldo, histórico de transações, relatórios) são claramente separadas de operações de escrita (criar pagamento, solicitar saque, adicionar endereço na whitelist), sendo estas últimas sempre identificadas visualmente com ícones de cadeado.

Funcionalidades incluem: gerenciamento de templates de pagamento reutilizáveis; visualização de saldos multi-moeda com taxas de conversão em tempo real; solicitação de saques com whitelist de endereços; histórico completo de transações com filtros avançados e modal de detalhes; página de pagamentos com busca rápida e seletor de intervalo de datas; geração de relatórios (PDF/CSV) com solicitação assíncrona; perfil da empresa com banner de status KYC; declaração reputacional com filtragem por data; gerenciamento de disputas; e seção de integração API com documentação e gerenciamento de chaves.

### Para quem é
O produto serve duas personas distintas com necessidades diferentes. A primeira persona são comerciantes "Mom & Pop"—pequenos negócios e empreendedores individuais que precisam de uma solução mobile-first para aceitar pagamentos cripto sem conhecimento técnico profundo. Para estes usuários, a interface prioriza simplicidade, fluxos lineares e ocultação de complexidade desnecessária.

A segunda persona são usuários profissionais de back-office—equipes financeiras, contadores e operadores de empresas maiores que necessitam de features desktop-first avançadas como reconciliação detalhada, exportação de relatórios, integração via API, e análise de disputas. Para estes, o dashboard oferece divulgação progressiva onde funcionalidades avançadas estão disponíveis mas não interferem com a experiência básica. Ambas personas compartilham a necessidade de transparência em taxas, velocidade de liquidação e conformidade regulatória.

### História de usuário macro (história única de herói)
**Como** um comerciante que vende produtos online para clientes internacionais,  
**Eu quero** aceitar pagamentos em criptomoeda (stablecoins) e receber o valor convertido automaticamente na minha conta PIX em reais brasileiros,  
**Para que** eu possa expandir minha base de clientes sem me expor à volatilidade de criptomoedas, sem precisar entender blockchain, e sem atrasos bancários tradicionais—recebendo meu dinheiro de forma rápida, transparente e com taxas previsíveis, enquanto mantenho controle total sobre meus saques através de uma whitelist de segurança.

---

## 2. Visão Geral da Arquitetura (Alto Nível)

### Modelo de interação Frontend ↔ Backend (leitura vs escrita)
A aplicação implementa separação CQRS estrita para todas interações com o backend:

**Operações de Leitura (Queries - GET):**
- Consultas de saldo, transações, pagamentos, disputas, relatórios
- Não requerem confirmação do usuário
- Exibidas em cards, tabelas e modais sem ícones de cadeado
- Podem ser cacheadas no frontend
- **Estratégia de polling/refresh:** Queries são classificadas em 3 categorias com políticas distintas:

**Categoria A - Críticas + Mudança Rápida:**
- **Política:** Sem refresh automático em background
- **Quando atualizar:**
  - No carregamento da página
  - Quando usuário clica manualmente em botão "Refresh" (ícone `RefreshCw` do lucide-react)
  - Quando usuário retorna ao tab (evento `visibilitychange` do document)
- **UX:** Adicionar botão de refresh pequeno visível próximo aos dados
- **Exemplos:** Saldos em tempo real, status de transação pendente, cotações de conversão
- **Justificativa:** Dados críticos devem ser explicitamente atualizados pelo usuário para evitar confusão com mudanças inesperadas

**Categoria B - Mudança Média:**
- **Política:** Fetch no carregamento, depois soft refresh periódico apenas enquanto usuário permanece na página
- **Intervalo:** A cada 60 segundos, MAS apenas se:
  - Usuário não interagiu nos últimos 30 segundos (sem click, scroll, ou digitação)
  - Página está visível (não em tab inativa)
- **Backoff:** Se API retornar erro, dobrar intervalo até máximo de 5 minutos
- **Quando atualizar:**
  - Carregamento da página
  - Intervalo de 60s (com condições acima)
  - Quando usuário retorna ao tab (evento `visibilitychange`)
- **Exemplos:** Lista de transações, histórico de pagamentos, lista de disputas
- **Justificativa:** Dados que mudam periodicamente mas não requerem atualização instantânea; balanceia frescor com economia de requisições

**Categoria C - Mudança Lenta:**
- **Política:** Apenas no carregamento da página + após ações relevantes + refresh manual
- **Quando atualizar:**
  - Carregamento da página
  - Após operações de escrita que afetam os dados (ex: criar template → refetch lista de templates)
  - Botão de refresh manual (se aplicável)
- **Otimistic UI:** Para listas, aplicar update otimista imediatamente após create/edit, depois re-fetch único (debounced 500ms)
- **Exemplos:** Templates de pagamento, whitelist de endereços, configurações de perfil, lista de chaves API
- **Justificativa:** Dados raramente mudam; atualização sob demanda reduz carga no servidor e melhora performance

**Implementação Técnica Recomendada:**
- Usar React Query ou SWR para gerenciar cache e refetch automático
- Configurar `staleTime` e `refetchInterval` por categoria
- Implementar hook customizado `useVisibilityRefresh()` para refresh on tab focus
- Adicionar flag `lastInteractionTime` via event listeners para Categoria B

**Operações de Escrita (Commands - POST/PUT/DELETE):**
- Criar template de pagamento, solicitar saque, adicionar whitelist, solicitar relatório, gerenciar chaves API
- Sempre exibem ícone de cadeado (`Lock` do lucide-react) no botão
- Requerem token Auth0 válido no header `Authorization: Bearer {token}`
- Devem retornar resposta de sucesso/erro clara para feedback ao usuário

**Estrutura de Resposta Padrão:**

| Status Code | Significado | Tratamento no Frontend |
|-------------|-------------|------------------------|
| `200 OK` | Operação executada com sucesso | Exibir mensagem de sucesso (ex: "Template criado com sucesso") e atualizar UI otimisticamente |
| `401 Unauthorized` | Token inválido, expirado ou ausente | Exibir mensagem "Não autorizado" e redirecionar para login via Auth0 |
| `403 Forbidden` | Autenticação OK mas 2FA não verificado | Exibir mensagem "Autenticação de dois fatores necessária para completar esta ação" e redirecionar para página de verificação 2FA |
| `429 Too Many Requests` | Rate limit excedido | Exibir mensagem "Muitas requisições, por favor aguarde antes de tentar criar um novo" |
| `400 Bad Request` | Erro de validação ou payload inválido | Exibir mensagem genérica "Erro ao criar [recurso]" (ex: "Erro ao criar template") |
| `500 Internal Server Error` | Erro no servidor | Exibir mensagem genérica "Erro ao criar [recurso]" |

**Padrão de Tratamento de Erro:**
```typescript
// Exemplo de tratamento no frontend
try {
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 200) {
    // Sucesso: mostrar feedback positivo
    showSuccessToast('Template criado com sucesso');
    refetchTemplates(); // Categoria C: refetch após write
  } else if (response.status === 401) {
    // Não autorizado: redirecionar para login
    showErrorToast('Não autorizado');
    loginWithRedirect();
  } else if (response.status === 403) {
    // 2FA necessário: redirecionar para verificação
    showErrorToast('Autenticação de dois fatores necessária para completar esta ação');
    navigate('/verify-2fa'); // TODO: Definir rota de verificação 2FA
  } else if (response.status === 429) {
    // Rate limit: instruir usuário a aguardar
    showErrorToast('Muitas requisições, por favor aguarde antes de tentar criar um novo');
  } else {
    // Erro genérico para 400/500
    showErrorToast('Erro ao criar template');
  }
} catch (error) {
  // Erro de rede ou timeout
  showErrorToast('Erro ao criar template');
}
```

**Observações:**
- Frontend não precisa diferenciar entre 400 e 500—ambos exibem mesmo erro genérico
- 401 (Unauthorized) redireciona para login Auth0
- 403 (Forbidden) indica que MFA step-up é necessário—dispara Auth0 popup
- 429 (Rate Limit) recebe mensagem específica para orientar usuário a aguardar
- Mensagens de erro devem ser localizadas via sistema de strings (`strings.errors.createFailed`, `strings.errors.rateLimitExceeded`, `strings.errors.mfaRequired`)
- Usar toast/snackbar para feedback não-bloqueante (biblioteca `sonner` já instalada)
- Após sucesso em operação de escrita, aplicar refetch baseado na categoria do recurso (ver estratégia de polling)

### Fluxo de Step-Up MFA (403 Forbidden)

**📋 IMPORTANTE:** A aplicação implementa **MFA por ação** (per-action MFA). TODA operação de escrita SEMPRE requer step-up MFA, MESMO se usuário completou MFA 1 segundo atrás. Cada write action dispara novo popup Auth0.

**Padrão Implementado:**

1. **Usuário clica em botão de write action** (ex: criar saque, adicionar endereço à whitelist)
2. **Frontend IMEDIATAMENTE dispara Auth0 popup** para step-up MFA (não espera 403)
3. **Auth0 Universal Login popup abre** solicitando MFA do usuário
4. **Usuário completa MFA** no popup Auth0 (TOTP, push notification, etc.)
5. **Frontend recebe novo token JWT** com claim `amr: ['mfa']`
6. **Frontend envia comando** com novo token no header Authorization
7. **Backend valida** claim `amr` no JWT e executa operação
8. **Frontend mostra feedback** (sucesso ou erro)

**CRÍTICO:** MFA codes NUNCA trafegam em payloads. Apenas tokens JWT com claims MFA.

**Uso em Componentes:**

```typescript
import { useAuth0 } from '@auth0/auth0-react';
import { postCommand } from '../lib/commandClient';

const { loginWithPopup, getAccessTokenSilently, user } = useAuth0();
const [isSubmitting, setIsSubmitting] = useState(false);

// Quando usuário clica em botão de write action
const handleWithdrawal = async (formData: WithdrawalData) => {
  setIsSubmitting(true);
  
  try {
    // STEP 1: SEMPRE dispara Auth0 popup para MFA step-up
    await loginWithPopup({
      authorizationParams: {
        // Force MFA challenge
        acr_values: 'http://schemas.openid.net/pam/policies/auth_level/mfa',
        prompt: 'login', // Force re-authentication
      },
      // Preservar estado para retornar após MFA
      appState: {
        returnTo: 'withdraw',
        formData: formData,
      },
    });

    // STEP 2: Obter novo token com claim MFA
    const accessToken = await getAccessTokenSilently({ 
      cacheMode: 'off' // Force fresh token
    });

    // STEP 3: Enviar comando com token MFA
    await postCommand('withdraw', formData, {
      accessToken,
      user,
      // NO mfaCode field!
    });

    // STEP 4: Sucesso
    toast.success('Saque solicitado com sucesso');
    refetchBalances();
    
  } catch (error) {
    if (error.error === 'popup_closed_by_user') {
      toast.error('Verificação MFA cancelada');
    } else if (error.error === 'consent_required') {
      toast.error('Consentimento necessário');
    } else {
      toast.error('Erro ao solicitar saque');
      console.error(error);
    }
  } finally {
    setIsSubmitting(false);
  }
};

// Renderizar botão
<Button onClick={handleWithdrawal} disabled={isSubmitting}>
  <Lock className="size-4 mr-2" />
  {isSubmitting ? 'Verificando MFA...' : 'Solicitar Saque'}
</Button>
```

**Estrutura do Payload (SEM mfaCode):**

```json
{
  // Dados do comando
  "amount": "1000.00",
  "currency": "BRL",
  "destination": "...",
  
  // Contexto do usuário (adicionado automaticamente por postCommand)
  "userContext": {
    "id": "usr_abc123",
    "role": "user_admin_crossramp",
    "metadata": {}
  }
  
  // NO mfaCode field!
}
```

**Estrutura do Token JWT com MFA:**

```json
{
  "sub": "auth0|6478a9b2c3d1e4f5g6h7i8j9",
  "email": "user@example.com",
  "https://crossramp.app/role": "user_admin_crossramp",
  
  // MFA claim - presente após step-up
  "amr": ["mfa"],  // Authentication Methods References
  
  "exp": 1703260800,
  "iat": 1703257200
}
```

**Backend Requirements - MFA por Ação:**

1. **Endpoint recebe token JWT** no header `Authorization: Bearer {token}`
2. **Backend valida JWT signature** (RS256 pelo Auth0)
3. **Backend extrai claim `amr`** do token
4. **Se operação requer MFA:**
   - Verificar que `amr` contém `'mfa'`
   - Se ausente: retornar 403 Forbidden com mensagem `"MFA required"`
   - Se presente: executar operação e retornar 200 OK
5. **Token MFA é de uso único conceitual:** cada write action exige novo step-up, mesmo que token anterior tenha `amr: ['mfa']`

**Operações que Requerem MFA:**

| Operação | Endpoint | MFA Obrigatório | Dispara Popup |
|----------|----------|-----------------|---------------|
| Solicitar saque | `POST /api/commands/withdraw` | ✅ Sim | ✅ Sim |
| Adicionar endereço à whitelist | `POST /api/commands/whitelist/add` | ✅ Sim | ✅ Sim |
| Adicionar chave PIX à whitelist | `POST /api/commands/whitelist/pix/add` | ✅ Sim | ✅ Sim |
| Remover endereço da whitelist | `POST /api/commands/whitelist/{id}/delete` | ✅ Sim | ✅ Sim |
| Criar chave API | `POST /api/commands/api-keys/create` | ✅ Sim | ✅ Sim |
| Desabilitar chave API | `POST /api/commands/api-keys/disable` | ✅ Sim | ✅ Sim |
| Criar template de pagamento | `POST /api/commands/template` | ✅ Sim | ✅ Sim |
| Atualizar template | `POST /api/commands/template/{id}` | ✅ Sim | ✅ Sim |
| Solicitar relatório | `POST /api/commands/report/request` | ✅ Sim | ✅ Sim |
| Adicionar usuário | `POST /api/commands/user` | ✅ Sim | ✅ Sim |

**TODAS write actions requerem MFA step-up. SEM EXCEÇÕES.**

**Gerenciamento de MFA (SecurityView):**

A view de Security (`/src/app/views/SecurityView.tsx`) permite usuários ativar/desativar MFA no Auth0:

```typescript
// Ativar MFA
POST /api/commands/security/mfa/activate
// → Backend registra solicitação no Auth0
// → Retorna: { status: 'pending', message: 'Check your Auth0 app for enrollment' }

// Confirmar MFA (após enrollment no Auth0)
POST /api/commands/security/mfa/confirm
Body: { mfa_code: "123456" } // Apenas para confirmar enrollment inicial
// → Backend valida código contra Auth0
// → Se válido, ativa MFA para o usuário
// → Retorna: { status: 'active', activatedAt: '...' }

// Desativar MFA
POST /api/commands/security/mfa/deactivate
Body: { mfa_code: "123456" } // Último código antes de desativar
// → Backend valida código antes de desativar no Auth0
// → Retorna: { status: 'not_activated' }

// Consultar status MFA
GET /api/security/mfa/status
// → Retorna: { status: 'active' | 'not_activated' | 'pending' }
```

**Nota:** Os comandos `confirmMFA` e `deactivateMFA` EXCEPCIONALMENTE recebem `mfa_code` no payload porque são parte do enrollment/unenrollment no Auth0, não são write actions normais.

**Vantagens do Padrão Auth0 Popup:**

1. **Segurança máxima:** MFA codes nunca trafegam em payloads
2. **Auth0 gerencia MFA:** TOTP, push, SMS - tudo via Auth0 Guardian
3. **JWT claims standard:** Usa claim `amr` padrão OAuth2/OIDC
4. **Auditoria:** Auth0 registra cada challenge MFA
5. **Granularidade extrema:** Cada ação = novo MFA

**Desvantagens:**

1. **UX pesada:** Popup para TODA write action
2. **Sem cache:** Mesmo que usuário fez MFA 1 segundo atrás, repete
3. **Popup blockers:** Usuários podem ter bloqueadores

**Recomendação:** Para MVP, considerar permitir cache de 5 minutos do token MFA. Para produção, manter padrão atual para segurança máxima.

**Comunicação API:**

> **Referência:** Ver `/docs/API_COMMAND_ENDPOINTS.md` para documentação completa de todos endpoints de comando com request/response schemas.

### Convenção de Endpoints API

**Arquitetura CQRS:**

| Tipo | Prefixo | Método | Exemplo |
|------|---------|--------|---------|
| **Query (Leitura)** | `/api/` | GET | `GET /api/templates` |
| **Command (Escrita)** | `/api/commands/` | POST | `POST /api/commands/template` |

**Separação clara entre operações de leitura (queries) e escrita (commands).**

**Client Implementation:**

O frontend usa `postCommand()` de `/src/app/lib/commandClient.ts` que automaticamente adiciona o prefixo `/api/commands/`:

```typescript
import { postCommand } from '../lib/commandClient';

// Componente passa path curto (sem prefixo)
await postCommand('users/add', payload, context);
// → POST https://api.crossramp.io/api/commands/users/add

await postCommand('whitelist/pix/add', payload, context);
// → POST https://api.crossramp.io/api/commands/whitelist/pix/add

// postCommand() automaticamente adiciona:
// - /api/commands/ prefix
// - Authorization header com Auth0 token
// - userContext no payload
```

**Ver documentação completa:** `/docs/API_COMMAND_ENDPOINTS.md`

---

## 3. Documentação de Features (Template)

> **Nota:** Este é um template reutilizável para documentar cada página/visualização. Não preencher até fase de integração.

### Feature: [Nome da Feature]
**Componente de View:** `/src/app/views/[NomeDaView].tsx`  
**ID de Rota/Navegação:** `[nav-id]`

#### História de usuário
**Como** [tipo de usuário],  
**Eu quero** [ação/objetivo],  
**Para que** [resultado de negócio].

#### Notas de UX
- [Padrão de interação chave ou decisão de design]
- [Considerações mobile vs desktop]
- [Notas de divulgação progressiva]
- [Considerações de acessibilidade]

#### Ações de leitura (queries)
| Ação | Método | Endpoint | Formato de Resposta | Tratamento de Erro |
|------|--------|----------|---------------------|---------------------|
| [Nome da ação] | `GET` | `TODO: /api/endpoint` | `TODO: { data: [...] }` | TODO |

#### Ações de escrita (commands)
| Ação | Método | Endpoint | Formato de Payload | Estado de Sucesso | Ícone de Cadeado |
|------|--------|----------|--------------------|--------------------|------------------|
| [Nome da ação] | `POST` | `TODO: /api/endpoint` | `TODO: { ... }` | TODO | ✓ |

#### Guia interno do produto
- **Quando usar:** [Cenário quando usuário acessaria esta feature]
- **Dependências:** [Outras features ou dados dos quais esta depende]
- **Casos extremos:** [Limitações conhecidas ou condições especiais]
- **Melhorias futuras:** [Melhorias planejadas ainda não implementadas]

---

## 4. Features Backend Transversais

### Integração Auth0 e RBAC

Auth0 fornece autenticação baseada em JWT com claims de papel incorporadas nos tokens. O dashboard implementa controle de acesso baseado em papéis (RBAC) com 4 roles definidas no Auth0.

#### Hierarquia de Papéis

| Role Auth0 | Nome de Display | Nível de Acesso | Persona Típica |
|------------|-----------------|-----------------|----------------|
| `user_admin_crossramp` | Administrador | Full write + read em todas views | CEO, CFO, Owner |
| `user_operations_crossramp` | Operações | Full write + read exceto Add User, Developers, Whitelists | Gerente de Operações, Contador |
| `user_analyst_crossramp` | Analista | Read-only em Reports, My Company (exceto Add User), Settings | Analista Financeiro, Auditor |
| `user_developer_crossramp` | Desenvolvedor | Full write + read apenas em Developers, Security, Settings | Engenheiro de Integração, DevOps |

#### Mapeamento de Permissões por View

**Legenda:**
- ✅ **Full Access** (read + write)
- 👁️ **Read-Only** (sem botões de write actions)
- ❌ **No Access** (view não aparece na navegação)

| View / Navegação | Admin | Operations | Analyst | Developer |
|------------------|-------|------------|---------|-----------|
| **Dashboard (Overview)** | ✅ | ✅ | ✅ | ✅ |
| **Operations Section** | | | | |
| └─ Withdraw | ✅ | ✅ | ❌ | ❌ |
| └─ Whitelist | ✅ | ❌ | ❌ | ❌ |
| └─ Templates | ✅ | ✅ | ❌ | ❌ |
| └─ Disputes | ✅ | ✅ | 👁️ | ❌ |
| **Reports Section** | | | | |
| └─ Analytics | ✅ | ✅ | 👁️ | ❌ |
| └─ Payments (Transactions) | ✅ | ✅ | 👁️ | ❌ |
| └─ Statement | ✅ | ✅ | 👁️ | ❌ |
| └─ Accounts (Balances) | ✅ | ✅ | 👁️ | ❌ |
| **Developers Section** | | | | |
| └─ API Integration | ✅ | ❌ | ❌ | ✅ |
| **My Company Section** | | | | |
| └─ Company Profile | ✅ | ✅ | 👁️ | ❌ |
| └─ Add User | ✅ | ❌ | ❌ | ❌ |
| **Settings Section** | | | | |
| └─ Dashboard Settings (App Settings) | ✅ | ✅ | 👁️ | ✅ |
| └─ Security | ✅ | ✅ | 👁️ | ✅ |
| **Support** | ✅ | ✅ | ✅ | ✅ |

#### Implementação no JWT Token

Auth0 deve incluir role claim no JWT token com namespace customizado:

```json
{
  "sub": "auth0|6478a9b2c3d1e4f5g6h7i8j9",
  "email": "user@example.com",
  "https://crossramp.app/role": "user_admin_crossramp",
  "https://crossramp.app/permissions": [
    "read:transactions",
    "write:transactions",
    "read:reports",
    "write:reports"
  ],
  "amr": ["mfa"],  // Authentication Methods References - presente após step-up MFA
  "exp": 1703260800,
  "iat": 1703257200
}
```

**Custom Claim Path:** `https://crossramp.app/role`  
**Formato:** String única representando o role do usuário

#### Frontend - Validação de Acesso

O frontend usa o hook `useAuth()` do contexto `/src/app/contexts/AuthContext.tsx` para verificar papéis:

```typescript
import { useAuth } from '../contexts/AuthContext';

// Verificar se usuário tem papel específico
const { hasRole } = useAuth();

// Exemplo: Mostrar botão de write apenas para roles autorizadas
{hasRole(['user_admin_crossramp', 'user_operations_crossramp']) && (
  <Button onClick={handleCreateTemplate}>
    <Lock className="size-4 mr-2" />
    Create Template
  </Button>
)}

// Exemplo: Ocultar view inteira baseada em role
const allowedForView = hasRole(['user_admin_crossramp', 'user_developer_crossramp']);
if (!allowedForView) {
  return <Navigate to="/dashboard" />;
}
```

**Nota:** Frontend RBAC é apenas UX—backend DEVE validar permissões em TODAS operações de escrita, independentemente do que o frontend exibe.

#### Backend - Validação de Acesso

Backend deve implementar middleware de autorização que verifica:

1. **Token válido:** JWT assinado com RS256 pelo Auth0
2. **Role claim presente:** `https://crossramp.app/role` existe no token
3. **MFA completa:** Para write operations, claim `amr` contém `'mfa'`
4. **Permissão para endpoint:** Role tem acesso ao recurso solicitado

**Exemplo de lógica de autorização:**

```typescript
// Pseudo-código backend
function authorizeEndpoint(req, endpoint, method) {
  const token = verifyJWT(req.headers.authorization);
  const userRole = token['https://crossramp.app/role'];
  
  // Write operations requerem MFA
  if (method !== 'GET') {
    if (!token.amr?.includes('mfa')) {
      return 403; // Forbidden - MFA required
    }
  }
  
  // Verificar permissão por endpoint
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions.includes(endpoint)) {
    return 403; // Forbidden - insufficient permissions
  }
  
  return 200; // Authorized
}

// Mapa de permissões (exemplo simplificado)
const ROLE_PERMISSIONS = {
  'user_admin_crossramp': ['*'], // Acesso total
  'user_operations_crossramp': [
    'POST /api/templates',
    'POST /api/withdraw',
    'GET /api/*',
    // Excluir: /api/whitelist, /api/users, /api/api-keys
  ],
  'user_analyst_crossramp': [
    'GET /api/transactions',
    'GET /api/reports',
    'GET /api/company-profile',
    // Apenas leitura
  ],
  'user_developer_crossramp': [
    'POST /api/api-keys',
    'GET /api/api-keys',
    'PUT /api/security-settings',
  ],
};
```

#### Estratégia de Refresh de Token

Auth0 SDK (`@auth0/auth0-react`) gerencia refresh automático usando estratégia **Silent Authentication** (iframe-based):

**Como Funciona:**
1. Aplicação solicita token via `getAccessTokenSilently()`
2. Se token em cache ainda válido (não expirado), retorna imediatamente
3. Se expirado, SDK tenta refresh automático via iframe invisível contra `/authorize` do Auth0
4. Auth0 verifica cookie de sessão (SSO) e emite novo token sem interromper usuário
5. Se cookie expirado ou inválido, requer login completo via `loginWithRedirect()`

**Configuração Recomendada:**

```typescript
// /src/app/App.tsx
<Auth0Provider
  domain={auth0Config.domain}
  clientId={auth0Config.clientId}
  authorizationParams={{
    redirect_uri: window.location.origin,
    audience: auth0Config.audience,
  }}
  cacheLocation="localstorage" // Persiste tokens entre tabs e page reloads
  useRefreshTokens={true}      // Habilita refresh tokens para silent auth
>
  {children}
</Auth0Provider>
```

**Token Lifetimes Recomendados:**
- **Access Token:** 15 minutos (curto por segurança)
- **Refresh Token:** 7 dias (ou session lifetime)
- **ID Token:** 15 minutos (mesmo que access token)
- **Sessão Auth0 (SSO Cookie):** 7 dias

**Handling Refresh Failures:**

```typescript
const getAccessToken = async () => {
  try {
    return await getAccessTokenSilently({
      cacheMode: 'on', // Use cache when possible
    });
  } catch (error) {
    if (error.error === 'login_required') {
      // Sessão expirou - redirecionar para login
      await loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
    } else if (error.error === 'consent_required') {
      // Novo consentimento necessário
      await loginWithRedirect({
        authorizationParams: { prompt: 'consent' }
      });
    } else {
      console.error('Token refresh failed:', error);
      // Fallback: tentar login
      await loginWithRedirect();
    }
  }
};
```

**Considerações de Segurança:**
- Tokens nunca devem ser expostos em URL ou console logs
- localStorage é seguro contra CSRF mas vulnerável a XSS—garantir CSP (Content Security Policy) strict
- Backend DEVE sempre validar tokens independentemente de cache no frontend
- Após step-up MFA, novo token com claim `amr: ['mfa']` substitui token anterior

**TODO Backend:**
- [ ] Configurar custom claim `https://crossramp.app/role` em Auth0 Action ou Rule
- [ ] Definir audience (API identifier) no Auth0 para namespace de API
- [ ] Implementar middleware de autorização validando role + MFA claims
- [ ] Configurar token lifetimes conforme recomendações acima

### Contratos de query/dados
O frontend espera estruturas de resposta JSON consistentes com formatos de erro padrão. **TODO:** Documentar estrutura de envelope de resposta da API, taxonomia de códigos de erro, contratos de paginação e regras de validação de dados.

### Expectativas de deployment
A aplicação é uma SPA estática que pode ser deployada em qualquer serviço de CDN/hospedagem estática (Vercel, Netlify, S3+CloudFront). **TODO:** Documentar comando de build, diretório de output, headers HTTP necessários (CORS, CSP), estratégia de injeção de variáveis de ambiente e endpoints de health check.

---

## 5. Apêndice

### Glossário

| Termo | Definição |
|-------|-----------|
| **PIX** | Sistema de pagamento instantâneo brasileiro |
| **Stablecoin** | Criptomoeda atrelada a moeda fiat (ex: USDC) |
| **UBO** | Ultimate Beneficial Owner / Beneficiário Final (conceito KYC) |
| **CQRS** | Command Query Responsibility Segregation (padrão arquitetural) |
| **Score Reputacional** | Sistema de pontuação de risco do comerciante (0-100) afetando taxas e limites |
| **Wabi-sabi** | Filosofia de design enfatizando simplicidade e imperfeição natural |
| **Divulgação Progressiva** | Padrão de UX revelando complexidade apenas quando necessário |
| **TODO** | Placeholder indicando documentação ou implementação necessária |

### Log de decisões

| Data | Decisão | Justificativa | Impacto |
|------|---------|---------------|---------|
| 22/12/2024 | Usar Auth0 para autenticação | Provedor OAuth2/OIDC padrão da indústria com SDK React maduro | Requer setup de tenant Auth0 e gerenciamento de credenciais |
| 22/12/2024 | Arquitetura CQRS estrita | Separação clara entre operações de leitura/escrita melhora manutenibilidade | Todas ações de escrita devem mostrar ícones de cadeado; backend deve suportar padrões de comando |
| 22/12/2024 | Roteamento client-side via estado | Simplifica implementação inicial sem biblioteca de roteador | Migração futura para React Router recomendada para navegação baseada em URL |
| 22/12/2024 | Arquivo de strings centralizado | Única fonte de verdade para todas traduções garante consistência | Todas novas features devem adicionar strings em `/src/app/content/strings.ts` |
| 22/12/2024 | Zustand apenas para preferências de UX | Gerenciamento de estado leve para configurações client-side | Dados de servidor devem usar gerenciamento de estado separado (React Query, SWR, etc.) |
| 22/12/2024 | Ocultar scrollbar em mobile-first | UX mobile mais limpa sem poluição visual de scrollbar | Desktop mantém scrollbars visíveis para descobribilidade |
| 22/12/2024 | Memória de posição de scroll | Preserva contexto do usuário ao navegar entre páginas | Melhora UX para power users revisando múltiplas seções |
| 23/12/2024 | MFA por ação com Auth0 popup | Segurança máxima; MFA codes apenas em tokens JWT; sem dados sensíveis em payloads | Toda write action dispara loginWithPopup(); backend valida claim amr:['mfa']; UX pesada mas segura |
| 23/12/2024 | Padronização `/api/commands/` | Separação CQRS clara entre queries e commands | Todos endpoints de escrita usam `/api/commands/` prefix; postCommand() adiciona automaticamente |
| 23/12/2024 | SecurityView migrada para CQRS | Consistência arquitetural com outras views | Comandos activateMFA, confirmMFA, deactivateMFA; query queryMFAStatus() |

### Questões abertas / TODOs

#### Autenticação e Autorização
- [ ] Quais são as URLs exatas do tenant Auth0 para staging e produção?
- [ ] Quais papéis existem na configuração do Auth0?
- [ ] Como as permissões são mapeadas para features da UI (ex: comerciantes podem acessar chaves de API)?
- [ ] Qual é a estratégia de refresh de token (silent refresh vs refresh tokens)?

#### Integração com API
- [ ] Qual é a URL base da API para staging e produção?
- [ ] Qual é a estrutura do envelope de resposta da API?
- [ ] Quais códigos de erro a API retorna e como devem ser exibidos?
- [ ] Qual rate limiting existe e como a UI deve lidar com respostas 429?
- [ ] Como a paginação é implementada (baseada em cursor ou offset)?

#### Contratos de Dados
- [ ] Quais são os formatos exatos dos objetos de transação, saldo e pagamento?
- [ ] Qual formato de data/hora a API usa (ISO 8601, Unix timestamps)?
- [ ] Qual formato e precisão de moeda é esperado (decimais, arredondamento)?
- [ ] Como enums são representados (strings ou códigos numéricos)?

#### KYC e Conformidade
- [ ] Quais status de KYC existem além de 'verified', 'pending', 'not_started'?
- [ ] O que dispara uma mudança de status KYC?
- [ ] Como o score reputacional é calculado e atualizado?
- [ ] Quais documentos são necessários para verificação KYC?

#### Disputas e Operações
- [ ] Quais são os status válidos de disputa e transições de estado?
- [ ] Quem pode criar, atualizar ou fechar disputas?
- [ ] Qual é o SLA para resolução de disputas?
- [ ] Como anexos de disputa são tratados (upload de arquivo)?

#### Relatórios e Exportação
- [ ] Quais tipos de relatório estão disponíveis além de PDF e CSV?
- [ ] Qual é o intervalo de datas máximo para geração de relatórios?
- [ ] Relatórios são gerados de forma síncrona ou assíncrona?
- [ ] Por quanto tempo relatórios gerados são armazenados?

#### Webhooks e Integração de API
- [ ] Quais eventos de webhook estão disponíveis para comerciantes?
- [ ] Qual é a estrutura do payload do webhook e verificação de assinatura?
- [ ] Como chaves de API são geradas, rotacionadas e revogadas?
- [ ] Quais limites de rate se aplicam às chaves de API?

#### Deployment e Operações
- [ ] Quais ferramentas de monitoramento/observabilidade devem ser integradas (Sentry, DataDog)?
- [ ] Quais analytics devem ser rastreadas (Mixpanel, Amplitude)?
- [ ] Quais são os padrões de tráfego esperados e requisitos de escalabilidade?
- [ ] Qual é o plano de recuperação de desastres para downtime do Auth0?

#### PWA e Mobile
- [ ] O app deve suportar funcionalidade offline via service workers?
- [ ] Quais features PWA são necessárias (prompt de instalação, push notifications)?
- [ ] Qual é a largura mínima de tela mobile suportada?
- [ ] O app deve suportar orientação paisagem em mobile?

#### Features Futuras
- [ ] Suporte multi-moeda além de BRL?
- [ ] Operações em lote (pagamentos em batch, whitelist em lote)?
- [ ] Widgets de dashboard customizados ou customização de layout?
- [ ] Preferências de notificação por email/SMS?
- [ ] Requisitos de autenticação de dois fatores (2FA)?

---

**Status do Documento:** ✅ Estrutura Completa — Pronto para preenchimento durante fase de integração  
**Próximos Passos:** Time de backend fornecer documentação e contratos da API; DevOps fornecer configuração de deployment  
**Responsabilidade:** Times de Produto & Engenharia colaboram para preencher TODOs durante revisão técnica