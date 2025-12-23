# Feature Documentation: Support

**Componente de View:** `/src/app/components/admin/SupportView.tsx`  
**ID de Rota/Navegação:** `support` (standalone at bottom of Sidebar, also in Topbar)  
**Acesso via Topbar:** HelpCircle icon button (top-right corner)  
**Acesso via Sidebar:** Support item (bottom section, highlighted with primary border)

## História de usuário

**Como** usuário do dashboard Crossramp (qualquer role: Admin, Operator, Analyst, Developer, ou mesmo new user durante onboarding),  
**Eu quero** acessar facilmente recursos de ajuda e suporte (FAQ, guias, WhatsApp support) em qualquer momento,  
**Para que** eu possa resolver problemas rapidamente sem sair da plataforma, aprender a usar novas features através de documentação self-service, e obter assistência humana via WhatsApp quando necessário, reduzindo friction e melhorando minha experiência com o produto.

## Notas de UX

- **Universal access:** **Todos os users** podem acessar Support (including users sem MFA ativo, KYC incomplete)
- **No authentication required:** Support page funciona mesmo antes de login (public docs links)
- **Always accessible:** 
  - **Topbar button:** HelpCircle icon (top-right, sempre visível em todas as páginas)
  - **Sidebar item:** Support (bottom section, visually highlighted com primary border/background)
- **No MFA required:** Support é read-only + external links (não há write actions)
- **Primary CTA:** WhatsApp contact (green button, prominent placement, direct link)
- **Self-service resources:** 4 documentation cards (FAQ, Quick Start, Advanced Guide, Usage Tips)
- **Page structure:** Single column, max-width 5xl, centered, clean layout
- **Components (stacked vertically):**
  1. **Page header** (title + subtitle)
  2. **WhatsApp CTA banner** (green gradient, prominent, call-to-action button)
  3. **Help Resources grid** (2x2 grid, 4 resource cards with external links)
  4. **Footer fallback** ("Can't find what you're looking for? Contact us on WhatsApp")
- **External links:** All resource cards open in new tab (target="_blank", rel="noopener noreferrer")
- **Wabi-sabi design:** Soft cards, warm colors (green for WhatsApp), no hard borders, hover animations

---

### **Page Header** 📄

**Title:** "Support"  
**Subtitle:** "Get help and learn how to make the most of Crossramp"

**Design:**
- Simple, clean header
- No icons (minimal distraction)
- Subtitle sets expectation: Self-service + live support available

---

### **WhatsApp CTA Banner** 💬 (Primary Feature)

**Visual design:**
- **Background:** Green gradient (from-green-50 to-emerald-50, dark mode adjusted)
- **Border:** Green (border-green-200, subtle)
- **Icon:** MessageCircle (green-500 background, white icon, 14x14 size)
- **Layout:** Flexbox (icon left, text center, button right, responsive stacks on mobile)

**Content:**
- **Title:** "Need immediate assistance?"
- **Description:** "Chat with our support team on WhatsApp for quick help with any questions or issues."
- **Button:** "Contact Support" (green-500 background, white text, MessageCircle icon)

**Behavior:**

1. **User clicks "Contact Support" button**
2. **Frontend constructs WhatsApp URL:**
   ```javascript
   const phoneNumber = '5511975407394';  // Brazil: +55 11 97540-7394
   const message = encodeURIComponent('Hi! I need help with Crossramp.');
   const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
   window.open(whatsappUrl, '_blank');
   ```
3. **WhatsApp opens in new tab/window:**
   - **Desktop:** Opens WhatsApp Web (if logged in) or prompts to open WhatsApp desktop app
   - **Mobile:** Opens WhatsApp mobile app (if installed) or WhatsApp Web
4. **Chat window opens** with pre-filled message: "Hi! I need help with Crossramp."
5. **User can edit message** before sending (add context, describe issue)
6. **User sends message** → Crossramp support team receives notification
7. **Support team responds** (target: <5 min response time during business hours)

**WhatsApp number details:**
- **Number:** +55 11 97540-7394 (Brazil, São Paulo area code)
- **Format:** `5511975407394` (country code + area + number, no special chars)
- **Business hours:** Monday-Friday, 9am-6pm BRT (Brazil Time)
- **After hours:** Auto-reply: "Thanks for contacting us! We'll respond within 24 hours."
- **Language:** Support available in Portuguese, English, Spanish

**Use cases:**
- **Urgent issues:** Payment stuck, withdrawal failed, cannot login
- **Technical problems:** Dashboard error, button not working, data not loading
- **Account questions:** KYC status, MFA setup help, role permissions
- **Billing inquiries:** Transaction fees, pricing questions, invoice requests
- **Feature requests:** Suggestions for improvements, missing functionality
- **General help:** How to use features, best practices, onboarding guidance

**Why WhatsApp:**
1. **Ubiquity:** 99% of Brazilian users have WhatsApp (primary communication channel)
2. **Familiarity:** Users already know how to use WhatsApp (no learning curve)
3. **Asynchronous:** Users can send message, get response later (no hold times)
4. **Rich media:** Support can send screenshots, videos, documents
5. **History:** Conversation history persisted (easy to reference past issues)
6. **Notifications:** Users get notified when support responds (no need to refresh)
7. **Mobile-friendly:** Works seamlessly on mobile devices (primary device for merchants)

**Alternative channels (future):**
- Email: support@crossramp.com (for formal requests, documentation)
- Phone: +55 11 1234-5678 (for urgent issues, enterprise customers)
- Live chat widget: Embedded in dashboard (Intercom/Zendesk integration)
- Support tickets: Track issues with ticket IDs (CRM integration)

---

### **Help Resources Grid** 📚 (Self-Service Documentation)

**Section title:** "Help Resources"

**Layout:** 2x2 grid (desktop), 1 column (mobile)

**4 Resource Cards:**

#### 1. **FAQ** ❓

**Icon:** FileQuestion (primary color, 6x6 size)  
**Title:** "FAQ"  
**Description:** "Find answers to commonly asked questions about features, payments, and troubleshooting."  
**Link:** `#` (TODO: Add actual FAQ URL → e.g., https://docs.crossramp.com/faq)

**Expected content (when implemented):**
- **General FAQs:**
  - What is Crossramp?
  - How does PIX ↔ stablecoin conversion work?
  - What are the fees?
  - What currencies are supported?
- **Account FAQs:**
  - How do I verify my account (KYC)?
  - How do I enable MFA?
  - How do I reset my password?
  - Can I have multiple users?
- **Payments FAQs:**
  - How long do PIX payments take?
  - How long do stablecoin transfers take?
  - What happens if a payment fails?
  - How do I track a transaction?
- **Withdrawals FAQs:**
  - How do I withdraw funds?
  - What is the minimum withdrawal amount?
  - How long do withdrawals take?
  - What are withdrawal fees?
- **Whitelist FAQs:**
  - What is a whitelist?
  - How do I add a PIX key?
  - Can I remove a whitelisted key?
  - Why is whitelisting required?
- **Troubleshooting FAQs:**
  - Dashboard not loading?
  - MFA code not working?
  - Can't create withdrawal?
  - Payment not showing?

**Format:** Accordion-style (collapsible questions) or search-enabled knowledge base

---

#### 2. **Quick Start Guide** 🚀

**Icon:** Rocket (primary color, 6x6 size)  
**Title:** "Quick Start Guide"  
**Description:** "Get started quickly with step-by-step instructions for your first transactions."  
**Link:** `#` (TODO: Add actual Quick Start URL → e.g., https://docs.crossramp.com/quick-start)

**Expected content (when implemented):**
- **Step 1:** Create account (sign up, email verification)
- **Step 2:** Complete KYC (upload CNPJ docs, wait for approval)
- **Step 3:** Enable MFA (scan QR code, confirm authenticator)
- **Step 4:** Create first template (name, PIX key, amount limits)
- **Step 5:** Receive first payment (share payment link, customer pays via PIX)
- **Step 6:** Whitelist withdrawal destination (add PIX key, verify)
- **Step 7:** Create withdrawal (select template, amount, confirm with MFA)
- **Step 8:** Track transaction (Payments page, view status)

**Target audience:** New merchants (onboarding)

**Estimated completion time:** 30-60 minutes (excluding KYC approval wait)

**Format:** Step-by-step tutorial with screenshots, videos (optional)

---

#### 3. **Advanced Guide** 📖

**Icon:** BookOpen (primary color, 6x6 size)  
**Title:** "Advanced Guide"  
**Description:** "Deep dive into advanced features, API integration, and best practices."  
**Link:** `#` (TODO: Add actual Advanced Guide URL → e.g., https://docs.crossramp.com/advanced)

**Expected content (when implemented):**
- **Advanced Features:**
  - Batch payments (process multiple payments at once)
  - Recurring payments (subscriptions, scheduled transfers)
  - Multi-currency support (USD, EUR, BRL)
  - Custom templates (complex rules, conditional logic)
- **API Integration:**
  - Authentication (API keys, JWT tokens)
  - Endpoints reference (GET /payments, POST /withdrawals, etc.)
  - Webhooks (receive notifications for payment events)
  - Rate limits (throttling, retry logic)
  - SDK libraries (Node.js, Python, PHP)
- **Best Practices:**
  - Security hardening (IP whitelisting, key rotation)
  - Error handling (retry strategies, fallback mechanisms)
  - Transaction monitoring (alerts, anomaly detection)
  - Reconciliation (balance matching, accounting integration)
  - Scaling (high-volume merchants, optimization tips)
- **Case Studies:**
  - E-commerce integration (WooCommerce, Shopify)
  - Marketplace payments (split payments, escrow)
  - Remittances (cross-border transfers)
  - Crypto on/off ramps (stablecoin liquidity)

**Target audience:** Technical users, developers, enterprise merchants

**Format:** Long-form documentation with code examples, diagrams

---

#### 4. **Usage Tips** 💡

**Icon:** Lightbulb (primary color, 6x6 size)  
**Title:** "Usage Tips"  
**Description:** "Learn tips and tricks to optimize your workflow and get the most from the platform."  
**Link:** `#` (TODO: Add actual Usage Tips URL → e.g., https://docs.crossramp.com/tips)

**Expected content (when implemented):**
- **Workflow Tips:**
  - Use templates to save time (pre-configure common scenarios)
  - Whitelist frequently used PIX keys (faster withdrawals)
  - Enable browser notifications (stay updated on payments)
  - Bookmark favorite pages (quick navigation)
- **Dashboard Tips:**
  - Collapse sidebar for more screen space (Settings → Layout)
  - Increase text size for readability (Settings → Accessibility)
  - Use dark mode for night work (Settings → Appearance)
  - Filter transactions by date (Payments → Date range selector)
- **Security Tips:**
  - Use strong passwords (password manager recommended)
  - Enable MFA immediately (protect account)
  - Don't share API keys (rotate regularly)
  - Review whitelist periodically (remove unused keys)
  - Monitor login activity (check for suspicious sessions)
- **Troubleshooting Tips:**
  - Clear browser cache if dashboard slow
  - Try incognito mode if issues persist
  - Check spam folder for MFA setup email
  - Verify phone time sync for TOTP codes
  - Contact support if problem persists
- **Performance Tips:**
  - Use bulk operations for large volumes (API batch endpoints)
  - Schedule withdrawals during off-peak hours (faster processing)
  - Pre-fund stablecoin balance (avoid delays)
  - Set up webhooks for real-time updates (no polling needed)

**Target audience:** All users (beginner to advanced)

**Format:** Short, actionable tips with screenshots

---

### **Resource Card Interaction** 🖱️

**Hover effects:**
- Card border changes to primary/20 (subtle highlight)
- Card shadow increases (hover:shadow-lg)
- Card scales up slightly (hover:scale-[1.02])
- Icon background darkens (group-hover:bg-primary/20)
- External link icon changes color (group-hover:text-primary)
- Smooth transitions (duration-200)

**Click behavior:**
- Opens link in new tab (target="_blank")
- Security headers applied (rel="noopener noreferrer")
- Prevents tab-nabbing attacks (noopener)
- Avoids referrer leaks (noreferrer)

**Accessibility:**
- Cards are focusable (keyboard navigation)
- Tab order: WhatsApp button → FAQ → Quick Start → Advanced → Usage Tips → Footer link
- External link icon provides visual cue (screen reader announces "opens in new tab")

---

### **Footer Fallback** 🔗

**Location:** Bottom of page, centered, below resources grid

**Content:**
- **Text:** "Can't find what you're looking for?"
- **Link:** "Contact us on WhatsApp" (inline link, primary color, underline on hover)

**Behavior:**
- Clicking link triggers same WhatsApp handler as main CTA button
- Opens WhatsApp with pre-filled message
- Provides redundant access to support (if user scrolled past main button)

**Design:**
- Small text (text-sm)
- Muted foreground (text-muted-foreground)
- Link stands out (text-primary, font-medium)
- Padding top/bottom (pt-8 pb-4)

---

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Carregar status de suporte (horário de funcionamento)** | `GET` | `/api/support/status` | `{}` | `{ "status": "online", "business_hours": { "timezone": "America/Sao_Paulo", "monday_friday": "09:00-18:00", "saturday_sunday": "closed" }, "current_time": "2024-12-22T14:30:00Z", "is_available": true, "estimated_response_time_minutes": 5, "message": "Our team is online and ready to help!" }` | **C** (Categoria C - Changes daily but not frequently, cache 1 hour) | Se falhar → Assume support available (default to "Contact us" message) |
| **Carregar lista de FAQs (future)** | `GET` | `/api/support/faqs?category=general&limit=10` | `{}` | `{ "faqs": [{ "id": "faq_001", "category": "general", "question": "What is Crossramp?", "answer": "Crossramp is a payments dashboard for accepting PIX and converting to stablecoins.", "views": 1234, "helpful_count": 987, "created_at": "2024-01-15T10:00:00Z", "updated_at": "2024-06-20T15:30:00Z" }], "total": 50, "categories": ["general", "payments", "withdrawals", "security", "troubleshooting"] }` | **C** (Categoria C - Static content, cache 24 hours) | Se falhar → Show "Unable to load FAQs. Please contact support." |
| **Carregar artigos de ajuda (future)** | `GET` | `/api/support/articles?section=quick-start` | `{}` | `{ "articles": [{ "id": "article_001", "section": "quick-start", "title": "How to Create Your First Template", "summary": "Step-by-step guide to creating payment templates.", "content": "# Step 1: Navigate to Templates page...", "author": "Support Team", "views": 5678, "estimated_reading_time_minutes": 5, "tags": ["beginner", "templates", "onboarding"], "created_at": "2024-02-01T09:00:00Z", "updated_at": "2024-11-10T12:00:00Z" }], "total": 25, "sections": ["quick-start", "advanced", "usage-tips"] }` | **C** (Categoria C - Static content, cache 24 hours) | Se falhar → Show "Unable to load articles. Visit our documentation site." |
| **Buscar documentação (future)** | `GET` | `/api/support/search?q=how+to+enable+mfa&limit=5` | `{}` | `{ "results": [{ "type": "faq", "id": "faq_042", "title": "How do I enable MFA?", "snippet": "Navigate to Security page, click Activate MFA, scan QR code...", "relevance_score": 0.95, "url": "/support/faq/how-to-enable-mfa" }, { "type": "article", "id": "article_015", "title": "Security Best Practices", "snippet": "...MFA is required for write actions. Follow these steps to enable...", "relevance_score": 0.82, "url": "/support/articles/security-best-practices" }], "total": 12, "query": "how to enable mfa" }` | **B** (Categoria B - User input, real-time search) | Se falhar → Show "Search unavailable. Browse categories or contact support." |

**Notas sobre categorização:**

- **Support Status (Categoria C):** Business hours são static (change only if company policy changes). Current availability é time-dependent but can be cached for 1 hour (acceptable staleness). Frontend pode determine availability client-side (check current time vs. business hours).

- **FAQs (Categoria C):** FAQ content é mostly static (updated monthly, not real-time). High cache tolerance (24 hours acceptable). Frontend pode fallback to hardcoded FAQs if API unavailable.

- **Articles (Categoria C):** Documentation articles são static content (versioned, updated occasionally). Long cache acceptable (24 hours). Similar to FAQs, can fallback to external docs site.

- **Search (Categoria B):** User-initiated search requires real-time results (dynamic query). Cannot cache (each query is unique). Lower priority than other queries (if API slow, show manual browse options).

**Current implementation:**
- Support page currently has **NO backend queries** (all static content + external WhatsApp link)
- Resource cards link to `#` placeholders (TODO: implement actual docs URLs)
- Future: Integrate with documentation CMS (Notion, Contentful, custom backend)

**Why no queries currently:**
1. **Simplicity:** Support page works instantly (no loading states, no API dependencies)
2. **Reliability:** Cannot fail (no backend = no downtime)
3. **Performance:** Zero latency (pure client-side rendering)
4. **MVP approach:** External docs links suffice for initial launch (iterate later)

**Future queries priority:**
1. **High:** Support status (show business hours, availability)
2. **Medium:** FAQs (most common questions, reduce WhatsApp volume)
3. **Medium:** Search (help users find answers quickly)
4. **Low:** Articles (can use external docs site initially)

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Requer MFA? | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-------------|---------------------|
| **Enviar mensagem WhatsApp** | `CLIENT` | `https://wa.me/{phoneNumber}?text={message}` | N/A (external WhatsApp URL, não é backend API) | N/A (Opens WhatsApp in new tab/window) | **Não** (External action, não é Crossramp backend) | **WhatsApp not installed:** Opens web.whatsapp.com (browser fallback) <br> **User cancels:** No action (window closes) <br> **Network error:** Browser shows "Cannot connect" (user can retry) |
| **Criar support ticket (future)** | `POST` | `/api/support/tickets` | `{ "subject": "Cannot create withdrawal", "category": "technical_issue", "priority": "high", "description": "I'm getting an error when trying to create a withdrawal: 'Insufficient balance'. However, my balance shows R$ 1,000.00 available.", "user_email": "user@example.com", "user_name": "John Doe", "merchant_id": "merchant_001", "attachments": [{ "filename": "screenshot.png", "content_type": "image/png", "size_bytes": 123456, "url": "https://s3.../screenshot.png" }] }` | `{ "ticket_id": "TICKET-12345", "status": "open", "created_at": "2024-12-22T14:30:00Z", "assigned_to": null, "estimated_response_time_hours": 4, "support_url": "https://support.crossramp.com/tickets/TICKET-12345" }` | **Não** (Support request, não é transactional action) | **Validation error:** Toast "Please fill all required fields" <br> **Rate limit (>5 tickets/hour):** Toast "Too many tickets created. Please use existing tickets or contact WhatsApp." <br> **API error:** Toast "Failed to create ticket. Please contact us on WhatsApp." |
| **Avaliar artigo de ajuda (helpful/not helpful) (future)** | `POST` | `/api/support/articles/{articleId}/feedback` | `{ "helpful": true, "comment": "This guide was very clear! Thanks!" }` | `{ "success": true, "message": "Thank you for your feedback!" }` | **Não** (Feedback, não security-critical) | Se falhar → Silent failure (no toast, low priority action) |
| **Buscar sugestão (autocomplete search) (future)** | `GET` | `/api/support/suggest?q=how+to+enable` | `{}` | `{ "suggestions": ["How to enable MFA", "How to enable notifications", "How to enable API access"], "query": "how to enable" }` | **Não** (Search suggestion, read-only) | Se falhar → No suggestions shown (user can still submit full search) |

**Parâmetros detalhados:**

### CLIENT-SIDE: Open WhatsApp Contact

**Action:** User clicks "Contact Support" button (or footer link)

**Client logic:**
1. User clicks button
2. `handleWhatsAppClick()` function executes
3. Constructs WhatsApp URL:
   ```javascript
   const phoneNumber = '5511975407394';  // +55 11 97540-7394
   const message = encodeURIComponent(
     t('support.whatsapp.defaultMessage')  // Translated message
   );
   const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
   ```
4. Opens URL in new window: `window.open(whatsappUrl, '_blank')`

**WhatsApp URL format:**
```
https://wa.me/5511975407394?text=Hi!%20I%20need%20help%20with%20Crossramp.
```

**URL parameters:**
- `phoneNumber`: International format, no special chars (+ removed)
  - Country code: 55 (Brazil)
  - Area code: 11 (São Paulo)
  - Number: 975407394
- `text`: URL-encoded message (pre-fills chat input)
  - Default: "Hi! I need help with Crossramp."
  - User can edit before sending

**Platform behavior:**

**Desktop:**
1. Opens WhatsApp Web (if user logged in to web.whatsapp.com)
2. If not logged in → Shows QR code (user scans with phone)
3. If WhatsApp Desktop installed → Browser may prompt "Open WhatsApp?" (app protocol handler)
4. Chat window opens with pre-filled message
5. User edits message (adds context), clicks Send

**Mobile (iOS/Android):**
1. Browser detects WhatsApp app installed → Opens app directly
2. If app not installed → Opens web.whatsapp.com (web fallback)
3. Chat opens with pre-filled message
4. User sends message → Support team notified

**No server-side tracking:**
- Crossramp backend does NOT track WhatsApp link clicks (pure client-side)
- No analytics on "how many users contacted support" (privacy)
- (Future) Can add analytics event: `trackEvent('support_whatsapp_clicked')`

**Error handling:**

1. **WhatsApp not installed (mobile):**
   - Browser opens web.whatsapp.com (fallback)
   - User can use WhatsApp Web (requires phone QR scan)

2. **User cancels (closes WhatsApp window):**
   - No action taken
   - Dashboard remains open (no disruption)

3. **Pop-up blocker:**
   - Browser blocks `window.open()`
   - User sees notification: "Pop-up blocked. Allow pop-ups to open WhatsApp."
   - User allows pop-ups → Clicks button again

4. **Invalid phone number (future maintenance):**
   - If phone number changes (company switches support number)
   - Update `phoneNumber` constant in code
   - Redeploy dashboard (no backend change needed)

**Alternative contact methods (future):**
- If WhatsApp unavailable → Show fallback: "Email us at support@crossramp.com"
- Show phone number: "Call us at +55 11 1234-5678"

**Translation:**
- Default message translated to user's locale (en, pt, es)
- English: "Hi! I need help with Crossramp."
- Portuguese: "Oi! Preciso de ajuda com a Crossramp."
- Spanish: "¡Hola! Necesito ayuda con Crossramp."

**Context enrichment (future):**
- Pre-fill message with user context:
  ```
  Hi! I need help with Crossramp.
  
  Account: user@example.com
  Merchant ID: merchant_001
  Current page: Withdrawals
  Issue: Cannot create withdrawal
  ```
- Helps support team respond faster (no need to ask for account details)

---

### POST /api/support/tickets (Future Implementation)

**Action:** Create support ticket (integrated ticketing system)

**Request example:**
```json
POST /api/support/tickets
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "subject": "Cannot create withdrawal",
  "category": "technical_issue",
  "priority": "high",
  "description": "I'm getting an error when trying to create a withdrawal: 'Insufficient balance'. However, my balance shows R$ 1,000.00 available. I've tried multiple times. Please help urgently.",
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "content_type": "image/png",
      "size_bytes": 234567,
      "url": "https://s3.amazonaws.com/crossramp-support/uploads/error_screenshot.png"
    }
  ]
}
```

**Categories:**
- `technical_issue` - Dashboard errors, bugs, glitches
- `account_question` - KYC, MFA, login issues
- `payment_inquiry` - Transaction status, refunds
- `billing_question` - Fees, invoices, pricing
- `feature_request` - Suggestions, improvements
- `general_inquiry` - Other questions

**Priority levels:**
- `low` - General questions (response: 24 hours)
- `medium` - Non-urgent issues (response: 8 hours)
- `high` - Urgent problems (response: 4 hours)
- `critical` - System down, funds stuck (response: 1 hour)

**Success response:**
```json
{
  "ticket_id": "TICKET-12345",
  "status": "open",
  "created_at": "2024-12-22T14:30:00Z",
  "assigned_to": null,
  "estimated_response_time_hours": 4,
  "support_url": "https://support.crossramp.com/tickets/TICKET-12345",
  "message": "Ticket created successfully. We'll respond within 4 hours."
}
```

**Error responses:**

1. **Validation error (missing fields):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Subject and description are required",
  "fields": {
    "subject": "Subject cannot be empty",
    "description": "Description must be at least 20 characters"
  }
}
```

2. **Rate limit (too many tickets):**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many tickets created. Please use existing tickets or contact WhatsApp support.",
  "retry_after": 3600,
  "current_ticket_count": 6,
  "max_tickets_per_hour": 5
}
```

3. **Attachment too large:**
```json
{
  "error": "ATTACHMENT_TOO_LARGE",
  "message": "Attachment exceeds maximum size of 5MB",
  "max_size_bytes": 5242880,
  "uploaded_size_bytes": 8388608
}
```

**Frontend flow:**
1. User clicks "Create Support Ticket" button (new feature, not currently in UI)
2. Modal opens with form:
   - Subject (text input, required)
   - Category (dropdown, required)
   - Priority (dropdown, optional, default: medium)
   - Description (textarea, required, min 20 chars)
   - Attachments (file upload, optional, max 5MB per file, max 3 files)
3. User fills form, clicks "Submit"
4. Frontend uploads attachments to S3 (presigned URLs)
5. Frontend calls `/api/support/tickets` with attachment URLs
6. Backend creates ticket in CRM (Zendesk, Freshdesk, or custom system)
7. Success toast: "Ticket created! We'll respond within 4 hours. Ticket ID: TICKET-12345"
8. User receives email confirmation with ticket link

**Integration options:**
- **Zendesk API:** `POST /api/v2/tickets`
- **Freshdesk API:** `POST /api/v2/tickets`
- **Intercom API:** `POST /conversations`
- **Custom:** Internal ticketing system (PostgreSQL table)

---

### POST /api/support/articles/{articleId}/feedback (Future)

**Action:** User marks article as helpful/not helpful

**Request:**
```json
POST /api/support/articles/article_001/feedback
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "helpful": true,
  "comment": "This guide was very clear and helped me enable MFA successfully. Thanks!"
}
```

**Success response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "updated_stats": {
    "helpful_count": 988,
    "not_helpful_count": 12,
    "helpful_percentage": 98.8
  }
}
```

**Frontend behavior:**
- Each article shows "Was this helpful?" at bottom
- Thumbs up/down buttons
- If user clicks thumbs down → Show textarea: "How can we improve this article?"
- Submit feedback → Silent success (no modal, just "Thank you" message)

**Analytics:**
- Track which articles are most/least helpful
- Identify articles needing improvement
- Measure documentation quality

---

## Guia interno do produto

### Quando usar

Users acessam Support page quando:

1. **Stuck/confused:** Cannot complete task (e.g., withdrawal fails, MFA not working)
2. **Learning:** Want to learn how to use features (e.g., how to create template)
3. **Troubleshooting:** Experiencing errors or unexpected behavior
4. **Onboarding:** New users exploring dashboard for first time
5. **Feature discovery:** Want to know what's possible (e.g., API integration)
6. **Billing questions:** Need clarification on fees, invoices
7. **Account issues:** KYC rejected, cannot login, forgot password
8. **Proactive help:** Just want to browse docs (curiosity, due diligence)

**Access points:**
- **Topbar:** HelpCircle button (top-right, always visible)
- **Sidebar:** Support item (bottom, highlighted with primary border)
- **Error states:** "Need help? Contact Support" links in error messages
- **Empty states:** "Learn more" links pointing to relevant docs

**Frequency:**
- **New users:** HIGH (multiple visits during onboarding, first week)
- **Experienced users:** LOW (occasional, when encountering new features or issues)
- **Power users:** VERY LOW (rarely need help, self-sufficient)

---

### Support Channels Overview

| Channel | Response Time | Availability | Best For | Language |
|---------|---------------|--------------|----------|----------|
| **WhatsApp** | <5 min (business hours), <24h (after hours) | Mon-Fri 9am-6pm BRT | Urgent issues, quick questions, real-time chat | PT, EN, ES |
| **Email** (future) | <24 hours | 24/7 (monitored daily) | Formal requests, documentation, detailed inquiries | PT, EN, ES |
| **Phone** (future) | <1 min (business hours) | Mon-Fri 9am-6pm BRT | Critical issues, high-value accounts | PT, EN |
| **Live Chat** (future) | <2 min (business hours) | Mon-Fri 9am-6pm BRT | Quick questions, embedded in dashboard | PT, EN, ES |
| **Support Tickets** (future) | <4 hours (high priority), <24h (low priority) | 24/7 (tracked in CRM) | Complex issues, requires investigation | PT, EN, ES |
| **Self-Service Docs** | Instant | 24/7 | Common questions, learning, reference | PT, EN, ES |

**Primary channel:** WhatsApp (highest user preference in Brazil, fastest response)

**Escalation path:**
1. User tries self-service docs (FAQ, Quick Start)
2. If unresolved → Contact WhatsApp support
3. If complex → Support creates internal ticket (escalates to engineering/product)
4. If urgent → Support escalates to on-call engineer (Slack notification)

---

### WhatsApp Support Workflow (Internal)

**Support team setup:**
- **Team size:** 2-3 agents (during business hours)
- **Tools:** WhatsApp Business app (desktop + mobile)
- **CRM integration:** Zapier → WhatsApp messages → Create Zendesk ticket (auto)
- **Response templates:** Pre-written answers for common questions (Quick Replies)
- **Escalation:** Tag @engineering in Slack if technical issue

**Agent workflow:**
1. **Message received** → WhatsApp Business notification
2. **Agent opens chat** → Sees user message + pre-filled context (if implemented)
3. **Agent identifies issue:**
   - Common question → Send Quick Reply (e.g., "How to enable MFA: [link]")
   - Technical issue → Request screenshots, error messages, account details
   - Billing question → Forward to billing team (billing@crossramp.com)
   - Feature request → Forward to product team (log in Notion/Linear)
4. **Agent resolves issue:**
   - Provide answer, guide user step-by-step
   - If complex → "Let me investigate and get back to you within 1 hour"
   - Create internal ticket for tracking (Zendesk/Freshdesk)
5. **Agent closes chat:**
   - "Is there anything else I can help with?"
   - User: "No, thanks!" → Agent: "Great! Feel free to reach out anytime."
   - Agent marks conversation as "Resolved" (internal tag)

**Metrics tracked:**
- **First response time:** Average time from message received → first agent reply (target: <5 min)
- **Resolution time:** Average time from first message → issue resolved (target: <30 min)
- **CSAT score:** Customer satisfaction ("How was your support experience?") (target: >90%)
- **Messages per day:** Volume of support requests (identify trends, staffing needs)
- **Top issues:** Most common questions (identify doc gaps, product improvements)

**Common Quick Replies:**

1. **"How to enable MFA?"**
   ```
   To enable MFA:
   1. Go to Security page (sidebar)
   2. Click "Activate MFA"
   3. Check your email for QR code
   4. Scan with Google Authenticator
   5. Confirm code in dashboard
   
   Need help? Let me know!
   ```

2. **"Payment not showing?"**
   ```
   Payments usually appear within 2-5 minutes. If it's been longer:
   1. Check Payments page (filter by date)
   2. Verify PIX key matches template
   3. Confirm payment was sent (check bank receipt)
   
   If still missing, please send:
   - Transaction ID (from bank)
   - Payment amount
   - Date/time sent
   
   I'll investigate!
   ```

3. **"Cannot create withdrawal?"**
   ```
   Common reasons:
   1. MFA not activated → Go to Security page
   2. Insufficient balance → Check Balances page
   3. Whitelist missing → Add PIX key in Whitelist page
   
   Which issue are you seeing? I can guide you!
   ```

---

### Self-Service Resources (Future Content)

**Documentation site structure:**

```
docs.crossramp.com/
├── Getting Started
│   ├── What is Crossramp?
│   ├── How it works (PIX ↔ stablecoins)
│   ├── Account setup (KYC)
│   └── First payment (tutorial)
├── Features
│   ├── Templates
│   ├── Payments
│   ├── Withdrawals
│   ├── Whitelist
│   ├── Balances
│   └── Reports
├── Security
│   ├── MFA setup
│   ├── API keys
│   ├── Whitelist management
│   └── Best practices
├── API Integration
│   ├── Authentication
│   ├── Endpoints reference
│   ├── Webhooks
│   ├── SDKs (Node.js, Python, PHP)
│   └── Code examples
├── Troubleshooting
│   ├── Dashboard errors
│   ├── Payment issues
│   ├── Withdrawal problems
│   └── MFA troubleshooting
└── FAQ
    ├── General
    ├── Payments
    ├── Withdrawals
    ├── Security
    └── Billing
```

**Documentation best practices:**
- **Screenshots:** Visual guides for every step (especially onboarding)
- **Videos:** Screen recordings for complex workflows (e.g., API integration)
- **Code examples:** Copy-paste snippets for developers (syntax highlighted)
- **Search:** Full-text search across all docs (Algolia DocSearch)
- **Versioning:** Document API versions (v1, v2, deprecation notices)
- **Translations:** Full PT/EN/ES translations (not just English)
- **Feedback:** "Was this helpful?" on every page (improve content)
- **Last updated:** Show last update date (ensure freshness)

**Content creation process:**
1. **Product launches feature** → Product team writes initial docs (draft)
2. **Support team reviews** → Adds common questions, troubleshooting tips
3. **QA team tests** → Verifies steps work, suggests improvements
4. **Content editor polishes** → Grammar, clarity, formatting
5. **Publish to docs site** → Link from dashboard Support page
6. **Iterate based on feedback** → Update quarterly (or when feature changes)

---

### Casos extremos

#### 1. **User clicks WhatsApp button but doesn't have WhatsApp installed (desktop)**

**Cenário:** Desktop user clicks "Contact Support", but never used WhatsApp Web.

**Symptoms:**
- Browser opens web.whatsapp.com
- Shows "To use WhatsApp on your computer: Open WhatsApp on your phone → Tap Menu → Linked devices → Link a device"
- User must scan QR code with phone

**Solution:**
- User scans QR with phone WhatsApp app
- Desktop WhatsApp Web activates
- Chat opens with pre-filled message
- User sends message

**Alternative:**
- If user doesn't have smartphone → Cannot use WhatsApp
- Show fallback: "Email us at support@crossramp.com" (add email CTA in Support page)

**Ops/CS guidance:**
- If user says "WhatsApp not working", ask: "Do you have WhatsApp on your phone?"
- If no → Provide email alternative
- If yes → Guide through QR scan process

---

#### 2. **WhatsApp number changes (company switches support number)**

**Cenário:** Crossramp changes support WhatsApp number (new team, different country, etc.).

**Problem:**
- Hardcoded number in code: `const phoneNumber = '5511975407394';`
- Must update code and redeploy

**Solution:**
1. **Short-term (urgent):** Update code, redeploy dashboard immediately
2. **Long-term (better):** Move phone number to backend config:
   ```javascript
   // Frontend fetches from API
   const { data } = await fetch('/api/support/config');
   const phoneNumber = data.whatsapp_number;
   ```
3. **Best practice:** Environment variable:
   ```javascript
   const phoneNumber = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER;
   ```

**Current implementation:** Hardcoded (acceptable for MVP, update later)

**Future improvement:** Backend-driven config (no redeploy needed for number change)

---

#### 3. **User sends abusive/spam messages on WhatsApp**

**Cenário:** User sends inappropriate content, spam, or harassment.

**Support action:**
1. **Block user** on WhatsApp Business (block phone number)
2. **Report to management** (escalate if serious)
3. **Document incident** (internal notes, screenshot)
4. **Optionally:** Suspend dashboard account (if ToS violation)

**Prevention:**
- WhatsApp has built-in spam detection
- Support team can report abusive users to WhatsApp
- Crossramp can implement rate limiting (max N messages per hour from same user)

---

#### 4. **Support resources (FAQ, guides) not yet created**

**Cenário:** User clicks FAQ card, link goes to `#` (placeholder).

**Current behavior:**
- Link does nothing (stays on same page)
- User confused: "Link broken?"

**Solution (current):**
- Update placeholder links to temporary external resources:
  - FAQ → Link to Notion public page (internal FAQ published externally)
  - Quick Start → Link to Loom video (screen recording of onboarding)
  - Advanced Guide → Link to API docs (separate docs site)
  - Usage Tips → Link to blog posts (Medium, company blog)

**Future (ideal):**
- Build dedicated docs site (docs.crossramp.com)
- Proper CMS (Notion, Contentful, Docusaurus)
- Update links in dashboard to point to real docs

**Workaround:**
- Remove resource cards until docs ready (cleaner UX)
- OR: Add "Coming soon" badge to cards (set expectations)

---

#### 5. **User contacts support outside business hours (night, weekend)**

**Cenário:** User has urgent issue at 11pm on Saturday.

**Current behavior:**
- WhatsApp message sent
- No immediate response (support team offline)
- User frustrated (expects instant help)

**Solution:**
1. **Auto-reply (WhatsApp Business feature):**
   ```
   Thanks for contacting Crossramp Support!
   
   Our team is currently offline.
   Business hours: Monday-Friday, 9am-6pm BRT
   
   We'll respond within 24 hours.
   For urgent issues, email us at urgent@crossramp.com
   ```

2. **Show business hours on Support page:**
   - Add "Business hours: Mon-Fri 9am-6pm BRT" under WhatsApp CTA
   - Set expectations (avoid frustration)

3. **Future:** 24/7 support (for enterprise customers, paid tier)

**Ops/CS handling:**
- Monday morning → Check weekend messages
- Prioritize by urgency (critical issues first)
- Respond in order received (FIFO)

---

#### 6. **User language doesn't match support language**

**Cenário:** User speaks French, but support only offers PT/EN/ES.

**Problem:**
- User sends message in French
- Support agent doesn't understand
- Communication breakdown

**Solution:**
1. **Google Translate (quick fix):**
   - Agent uses Google Translate to read message
   - Responds in English (closest common language)
   - User can translate response

2. **Language detection (future):**
   - Detect message language
   - Auto-reply: "We detected French. Our support is in Portuguese, English, and Spanish. Would you like to continue in English?"

3. **Multilingual support (long-term):**
   - Hire multilingual agents
   - Or: Partner with translation service

**Current:** PT/EN/ES only (acceptable for LATAM market)

---

#### 7. **Resource card links open in same tab (user loses dashboard context)**

**Cenário:** User clicks FAQ card, opens in same tab, loses place in dashboard.

**Current implementation:** Links open in new tab (`target="_blank"`) ✅

**Why important:**
- User may be mid-task (e.g., creating withdrawal)
- Opening docs in same tab → Loses form data (frustrating)
- New tab = keeps dashboard open (easy to switch back)

**Edge case:** Some browsers block `target="_blank"` (security setting)
- Solution: User sees "Pop-up blocked" notification
- User allows pop-ups, clicks link again

---

#### 8. **User clicks WhatsApp link on mobile but has WhatsApp Business app instead of personal**

**Cenário:** Merchant has WhatsApp Business on phone (for their own business), not personal WhatsApp.

**Behavior:**
- `wa.me` link may open in WhatsApp Business app
- User can still send message from business account (works fine)
- Message shows business name instead of personal name

**Not a problem:** Support can respond to messages from WhatsApp Business accounts (just shows different sender name)

---

#### 9. **Pop-up blocker prevents WhatsApp window from opening**

**Cenário:** User's browser blocks `window.open()` (privacy setting).

**Symptoms:**
- User clicks "Contact Support" button
- Nothing happens (no new tab)
- Browser shows notification: "Pop-up blocked"

**Solution:**
1. **User allows pop-ups:**
   - Click notification → "Always allow pop-ups from crossramp.com"
   - Click button again → WhatsApp opens
2. **Alternative:** Show toast message:
   ```
   WhatsApp blocked by browser.
   Please allow pop-ups or visit: https://wa.me/5511975407394
   ```

**Future improvement:**
- Detect pop-up block
- Show modal with direct link: "Click here to open WhatsApp"
- Fallback: Copy link to clipboard

---

#### 10. **Documentation search returns no results (user query too specific)**

**Cenário (future):** User searches "how to integrate crossramp with shopify dropshipping for crypto payments".

**Problem:**
- Query very specific, no exact match in docs
- Search returns 0 results
- User frustrated: "Docs incomplete!"

**Solution:**
1. **Fuzzy search:** Return partial matches (e.g., "shopify integration", "crypto payments")
2. **Suggestions:** "Did you mean: Shopify integration?"
3. **Fallback:** "No results found. Contact support for help with your specific use case."
4. **Contact form:** Pre-fill support ticket with search query (helps support understand intent)

**Future:** AI-powered search (semantic search, not just keyword matching)

---

### Melhorias futuras

1. **Integrated Help Widget:** Embedded chat in dashboard (Intercom/Zendesk Widget)
2. **Contextual Help:** Show relevant docs based on current page (e.g., MFA help on Security page)
3. **Video Tutorials:** Loom/YouTube embeds for complex workflows
4. **Interactive Guides:** Step-by-step walkthroughs with progress indicators
5. **AI Chatbot:** GPT-4 powered assistant for instant answers (fallback to human)
6. **Community Forum:** User-to-user support (Reddit/Discourse style)
7. **Status Page:** Real-time system status (uptime, incidents, scheduled maintenance)
8. **Release Notes:** Changelog for new features (in-app notifications)
9. **Onboarding Checklist:** Guided setup with links to relevant docs
10. **In-App Notifications:** Support responses shown in dashboard (no need to check email)
11. **Screen Recording:** Allow users to record bugs (Loom integration)
12. **Support Ticket History:** View past tickets, reopen if needed
13. **Escalation Tracking:** See ticket status (open, in progress, resolved)
14. **SLA Commitments:** Guaranteed response times for enterprise customers
15. **Multi-Channel Support:** Email, phone, SMS, Twitter DM (omnichannel)

---

### Best practices para compartilhar com Users

1. **Try self-service first:** Check FAQ before contacting support (faster resolution)
2. **Be specific:** Describe issue clearly ("Withdrawal fails with error X" vs "Something is broken")
3. **Provide context:** Account email, merchant ID, screenshot, error message
4. **Check spam folder:** MFA setup emails, support responses may go to spam
5. **Business hours:** WhatsApp support Mon-Fri 9am-6pm BRT (expect delays after hours)
6. **One issue per message:** Don't combine multiple questions (easier to track)
7. **Bookmark docs:** Keep Quick Start guide handy (reference during onboarding)
8. **Update contact info:** Ensure email/phone up-to-date (for support responses)
9. **Read error messages:** Error often explains problem (e.g., "MFA required")
10. **Patience:** Complex issues may take time to investigate (support will follow up)

---

### Metrics para Support Ops

**Track these metrics to measure support effectiveness:**

1. **First Response Time (FRT):** Average time from message received → first agent reply
   - **Target:** <5 minutes (business hours), <24 hours (after hours)
   - **Measure:** WhatsApp message timestamp → first agent message timestamp

2. **Resolution Time:** Average time from first message → issue resolved
   - **Target:** <30 minutes (simple), <4 hours (complex)
   - **Measure:** First message → "Issue resolved, closing ticket"

3. **Customer Satisfaction (CSAT):** "How satisfied are you with support?"
   - **Target:** >90% satisfied (4-5 stars)
   - **Measure:** Post-conversation survey (WhatsApp or email)

4. **Ticket Volume:** Messages per day/week/month
   - **Benchmark:** Track trends (increasing = product issues or growth)
   - **Use:** Staffing decisions (hire more agents if volume increases)

5. **Common Issues:** Top 10 most frequent questions/problems
   - **Use:** Identify doc gaps (if many users ask same question → add to FAQ)
   - **Use:** Product improvements (if many bugs reported → prioritize fix)

6. **Self-Service Rate:** % of users who found answer without contacting support
   - **Measure:** Docs page views vs. support messages
   - **Target:** >60% find answer in docs (reduce support load)

7. **Escalation Rate:** % of tickets escalated to engineering/product
   - **Measure:** Tickets tagged "escalated" / total tickets
   - **Target:** <10% (most issues should be resolvable by support)

8. **Repeat Contact Rate:** % of users contacting support multiple times for same issue
   - **Measure:** Same user, similar issue within 7 days
   - **Target:** <5% (first resolution should solve problem)

---

### Notas para Ops/CS

#### Troubleshooting comum

**"WhatsApp link não funciona"**
- **Verificar:**
  1. WhatsApp instalado? (phone or web.whatsapp.com)
  2. Pop-up bloqueado? (allow pop-ups)
  3. Link correto? (check phone number format)
- **Solução:** Guide user through WhatsApp Web setup (QR scan)

**"Não encontrei resposta nos docs"**
- **Investigar:** What was user searching for? (identify doc gap)
- **Solução:** Provide direct answer, add to FAQ backlog

**"Support demorou para responder"**
- **Verificar:** When did user message? (business hours?)
- **Explicar:** Business hours Mon-Fri 9am-6pm BRT, <24h after hours
- **Solução:** Set auto-reply with expected response time

**"Resource card links não funcionam"**
- **Causa:** Placeholder `#` links (docs not yet created)
- **Solução:** Update links to temporary resources (Notion, Loom videos)
- **Long-term:** Build dedicated docs site

**"Como criar support ticket?"**
- **Resposta:** Currently only WhatsApp support (tickets feature not implemented)
- **Future:** Support ticket system coming soon (track issues with IDs)

---

This documentation provides comprehensive coverage of the Support page, including WhatsApp integration, self-service resources, future ticketing system, operational workflows, and detailed troubleshooting guidance for the Ops/CS team.
