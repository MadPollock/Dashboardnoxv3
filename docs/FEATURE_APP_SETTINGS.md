# Feature Documentation: App Settings

**Componente de View:** `/src/app/views/DashboardSettingsView.tsx`  
**Componente Principal:** `/src/app/components/settings/PreferencesPanel.tsx`  
**Store (Zustand):** `/src/app/store/userPreferences.ts`  
**ID de Rota/Navegação:** `dashboard-settings` (under Settings section)

## História de usuário

**Como** usuário do dashboard Crossramp (qualquer role: Admin, Operator, Analyst, Developer),  
**Eu quero** personalizar a aparência, layout e acessibilidade do dashboard de acordo com minhas preferências,  
**Para que** eu tenha uma experiência mais confortável e produtiva ao trabalhar com a plataforma diariamente, adaptando a interface ao meu ambiente de trabalho (escritório claro/escuro), necessidades de leitura (tamanho de texto), e preferências de navegação (sidebar colapsado/expandido).

## Notas de UX

- **Universal access:** **Todos os roles** (Admin, Operator, Analyst, Developer) podem acessar Settings
- **No MFA required:** Preferences são UX-only (não afeta transactional data, sem segurança crítica)
- **Client-side only:** **100% localStorage** (Zustand persist middleware, não envia ao backend)
- **Auto-save:** Changes são salvas **instantaneamente** (no "Save" button needed)
- **Session persistence:** Preferences sobrevivem logout/login (persisted em localStorage)
- **No server sync:** Preferences são **device-specific** (user com multiple devices = independent settings)
- **Page structure:** Single column, max-width 4xl, centered, 3 cards stacked vertically
- **Settings Cards:**
  1. **Appearance** (Sun/Moon icon)
  2. **Layout** (Settings icon)
  3. **Accessibility** (Eye icon)
- **Reset button:** Bottom of page, "Reset to Defaults" (outline variant, RotateCcw icon)
- **Language selector:** **NÃO está na Settings page** (está no Topbar, dropdown no canto superior direito)

---

### **Card 1: Appearance** ☀️/🌙

**Title:** "Appearance"  
**Description:** "Choose your preferred color scheme"  
**Icon:** Sun (light mode) / Moon (dark mode)

**Settings:**

1. **Dark Mode** (Switch toggle)
   - **Label:** "Dark Mode"
   - **Description:** "Switch between light and dark themes"
   - **Values:** 
     - `false` = Light mode (default, orange/yellow warm palette)
     - `true` = Dark mode (dark background, warm accents)
   - **Behavior:**
     - Toggle switch updates instantly
     - Changes entire app theme (all pages, components)
     - Persisted to localStorage (`theme: 'light' | 'dark'`)
     - Synced with next-themes (SSR-friendly theme provider)
     - Icon in Topbar changes: Sun ☀️ (light mode) → Moon 🌙 (dark mode)
   - **Responsive:** Works on all devices (desktop/mobile)

**Technical notes:**
- Uses `next-themes` library for theme management
- Store persists: `theme: 'light' | 'dark'`
- CSS variables in `/src/styles/theme.css` adjust colors
- Dark mode = higher contrast, easier on eyes em ambientes escuros
- Light mode = better for bright office environments

---

### **Card 2: Layout** ⚙️

**Title:** "Layout"  
**Description:** "Adjust the dashboard layout to your preference"  
**Icon:** Settings

**Settings:**

1. **Collapse Sidebar** (Switch toggle)
   - **Label:** "Collapse Sidebar"
   - **Description:** "Minimize the navigation sidebar"
   - **Values:**
     - `false` = Sidebar expandido (default, mostra labels + icons)
     - `true` = Sidebar colapsado (apenas icons, sem labels)
   - **Behavior:**
     - Toggle switch updates instantly
     - Sidebar width changes: 240px (expandido) → 64px (colapsado)
     - Navigation items show icon only quando colapsado
     - Tooltips aparecem on hover quando colapsado (mostram label)
     - More horizontal space para content area (útil em telas pequenas)
     - Persisted to localStorage (`sidebarCollapsed: boolean`)
   - **Responsive:** 
     - Mobile: Sidebar sempre colapsado (hamburger menu)
     - Desktop: User pode escolher collapsed/expanded

**Technical notes:**
- Store persists: `sidebarCollapsed: boolean`
- Sidebar component reads `useUserPreferences((state) => state.sidebarCollapsed)`
- Transition animation: smooth width change (300ms ease-in-out)
- Collapsed sidebar útil para: Users com monitores pequenos, power users que conhecem icons

---

### **Card 3: Accessibility** 👁️

**Title:** "Accessibility"  
**Description:** "Options to improve readability and usability"  
**Icon:** Eye

**Settings:**

1. **Text Size** (Slider 4 steps)
   - **Label:** "Text Size"
   - **Current value displayed:** "Small" | "Default" | "Large" | "Extra Large" (to the right of label)
   - **Description:** "Adjust the size of all text in the dashboard" (below slider)
   - **Values:**
     - `87.5%` = Small (compact, mais conteúdo visível)
     - `100%` = Default (standard, optimized for readability) ✅ **Default**
     - `112.5%` = Large (easier to read, menos strain)
     - `125%` = Extra Large (maximum readability, accessibility)
   - **UI Control:** 
     - Slider component (4 discrete steps, 0-3 index)
     - Min: 0 (87.5%), Max: 3 (125%), Step: 1
     - Visual dots at each step
     - Thumb indicator moves between steps
   - **Behavior:**
     - Slider change updates instantly
     - Sets `document.documentElement.style.fontSize = '{value}%'`
     - Affects **ALL text** em todo dashboard (headings, body, labels, tables, buttons)
     - Typography scale adjusts proportionally (h1, h2, p, etc.)
     - Persisted to localStorage (`textSize: 87.5 | 100 | 112.5 | 125`)
     - Label to the right shows current size name (e.g., "Large")
   - **Use cases:**
     - Small: Power users com bom eyesight, querem ver mais dados
     - Default: Maioria dos users (optimized balance)
     - Large: Users com vision impairment leve, trabalham muitas horas
     - Extra Large: Accessibility compliance (WCAG 2.1), senior users, low vision

**Technical notes:**
- Store persists: `textSize: 87.5 | 100 | 112.5 | 125` (percentage values)
- Applied to root element: `document.documentElement.style.fontSize`
- Uses CSS `rem` units (relative to root font size)
- All typography in dashboard uses `rem` units → scales automatically
- Slider uses 0-3 index internally, mapped to percentage values
- `useEffect` on mount applies persisted text size

---

### **Reset to Defaults Button** 🔄

**Location:** Bottom of page, right-aligned  
**Variant:** Outline (not destructive, but important action)  
**Icon:** RotateCcw (refresh/reset icon)  
**Label:** "Reset to Defaults"

**Behavior:**
- **Click action:** Resets **ALL** preferences to factory defaults:
  - `theme: 'light'`
  - `sidebarCollapsed: false`
  - `textSize: 100`
  - `locale: 'en'` (also resets language!)
  - All other preferences in store (favoriteViews, defaultView, etc.)
- **No confirmation modal:** Immediately resets (can re-customize if mistake)
- **Visual feedback:** Page updates instantly (theme changes, sidebar expands, text size resets, language → English)
- **Toast notification:** (Futuro) "Settings reset to defaults"
- **Use case:** User experimented com settings, now wants clean slate

**Important:** Reset também affects language (Topbar dropdown) → Volta para English

---

### **Language Selector** 🌐 (NOT in Settings page)

**Location:** **Topbar** (top-right corner, antes do User menu)  
**Component:** Dropdown menu button  
**Icon:** Flag emoji + Language code (e.g., 🇬🇧 EN, 🇧🇷 PT, 🇪🇸 ES)

**Languages supported:**
1. 🇬🇧 **English** (EN) - Default
2. 🇧🇷 **Português** (PT) - Brazilian Portuguese
3. 🇪🇸 **Español** (ES) - Spanish

**Behavior:**
- **Button shows:** Flag emoji + code (mobile: apenas flag, desktop: flag + code)
- **Click:** Opens dropdown menu
- **Menu label:** "Language" (translated to current language)
- **Menu items:** 
  - 🇬🇧 English ✓ (checkmark if selected)
  - 🇧🇷 Português
  - 🇪🇸 Español
- **Selection:** Click language → Entire app translates instantly
- **Persistence:** Saved to localStorage (`locale: 'en' | 'pt' | 'es'`)
- **Affects:** ALL strings em todo dashboard (navigation, buttons, labels, tooltips, error messages)
- **Technical:** Uses `/src/app/content/strings.ts` translation table + `useStrings()` hook

**Why NOT in Settings page?**
- Language é frequently changed (users bilíngues, demonstrações)
- Topbar = always visible (no need to navigate to Settings)
- Quick access = better UX (1 click vs. 2 clicks)

---

### **Settings NOT Implemented (strings exist, UI não existe)**

The following settings have translation strings but **NO UI components** (future features):

1. **Compact Mode** (`settings.layout.compactMode`)
   - Reduce spacing para content density
   - Not implemented (no UI control)

2. **Visual Theme** (`settings.visualTheme.title`)
   - Chart color themes (Crossramp, Vibrant, Muted, Monochrome)
   - Not implemented (analytics charts sempre usam default)

3. **Enable Animations** (`settings.visualTheme.enableAnimations`)
   - Toggle smooth transitions/effects
   - Not implemented (animations always enabled)

4. **High Contrast** (`settings.accessibility.highContrast`)
   - Increase visual contrast (accessibility)
   - Not implemented (no UI toggle)

5. **Reduced Motion** (`settings.accessibility.reducedMotion`)
   - Minimize animations (accessibility, motion sickness)
   - Not implemented (no UI toggle)

6. **Date Format** (`settings.dataDisplay.dateFormat`)
   - Relative (2 hours ago) vs. Absolute (Jan 15, 2024)
   - Not implemented (dashboard always uses relative)

7. **Number Format** (`settings.dataDisplay.numberFormat`)
   - Compact (1.2K) vs. Full (1,234)
   - Not implemented (dashboard always uses full)

8. **Onboarding Progress** (`settings.onboardingProgress.title`)
   - Track setup completion (KYC, MFA, Template, Checkout)
   - Not implemented in Settings UI (lives in SetupProgressBar in Topbar)

**Future roadmap:** These settings podem ser added later (already have translations, easy to implement)

---

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Carregar preferências do localStorage** | `CLIENT` | `localStorage.getItem('cqrs-dashboard-preferences')` | N/A (client-side only) | `{ "state": { "sidebarCollapsed": false, "theme": "light", "locale": "en", "textSize": 100, "favoriteViews": [], "defaultView": "dashboard", "lastVisitedView": "dashboard", "onboardingStep": 0, "onboardingSteps": { "kyc": "pending", "mfa": "pending", "template": "pending", "checkout": "pending" }, "dismissedBanners": [] }, "version": 0 }` | **Client-only** (No server query, 100% localStorage) | Se localStorage vazio ou corrupted → Load default preferences (theme: 'light', textSize: 100, etc.) |

**Importante:** Settings page **NÃO FAZ** queries ao backend. É 100% client-side (localStorage).

**Notas sobre "Client-only":**

- **Sem backend queries:** App Settings é puramente frontend (no API calls)
- **localStorage read:** On app load, Zustand reads `localStorage.getItem('cqrs-dashboard-preferences')`
- **Zustand middleware:** `persist()` middleware automatically handles load/save
- **Fallback:** Se localStorage empty (first visit) → Use `defaultPreferences` from store
- **Corruption handling:** Se JSON.parse fails (corrupted data) → Reset to defaults
- **Cross-tab sync:** localStorage changes em outra tab **NÃO** sync automatically (known limitation, acceptable for UX preferences)

**Why no server sync?**

1. **Performance:** Instant load (no network latency)
2. **Privacy:** User preferences não need to be tracked server-side
3. **Offline-first:** Works sem internet connection
4. **Device-specific:** User pode prefer dark mode no laptop, light mode no desktop (separate devices = separate preferences)
5. **Simplicity:** No server state to manage, no conflicts, no sync bugs

**Trade-off:**

- **Pro:** Fast, private, offline-capable
- **Con:** Preferences não sync across devices (user must configure each device separately)

**Future enhancement:** (Not planned currently)
- Opcional server sync para enterprise users (preferences synced via backend)
- Requires: `/api/preferences/get` query + `/api/preferences/update` command
- Use case: User trabalha em multiple devices (desktop + laptop + mobile), wants consistent experience

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Requer MFA? | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-------------|---------------------|
| **Atualizar Dark Mode** | `CLIENT` | `localStorage.setItem(...)` | `{ "theme": "dark" }` | N/A (client-side, localStorage updated) | **Não** (UX preference, não security-critical) | Se localStorage full (quota exceeded, raro) → Toast "Unable to save preferences (storage full)" + Still apply theme (session-only, não persisted) |
| **Atualizar Sidebar Collapsed** | `CLIENT` | `localStorage.setItem(...)` | `{ "sidebarCollapsed": true }` | N/A (client-side, localStorage updated) | **Não** | Same as above |
| **Atualizar Text Size** | `CLIENT` | `localStorage.setItem(...)` | `{ "textSize": 112.5 }` | N/A (client-side, localStorage updated) | **Não** | Same as above |
| **Atualizar Language (Locale)** | `CLIENT` | `localStorage.setItem(...)` | `{ "locale": "pt" }` | N/A (client-side, localStorage updated) | **Não** | Same as above |
| **Reset All Preferences** | `CLIENT` | `localStorage.setItem(...)` | `{ ...defaultPreferences }` (all defaults) | N/A (client-side, localStorage updated) | **Não** | Se localStorage unavailable → Toast "Unable to reset preferences" + Still apply defaults (session-only) |

**Parâmetros detalhados:**

### CLIENT-SIDE: Update Theme (Dark Mode)

**Action:** User toggles Dark Mode switch

**Client logic:**
1. User clicks Switch component
2. `onCheckedChange` handler fires
3. Calls `setTheme('dark')` (next-themes)
4. Calls `setThemePreference('dark')` (Zustand store)
5. Zustand updates state: `theme: 'dark'`
6. Zustand persist middleware auto-saves to localStorage
7. Next-themes applies dark mode CSS variables
8. Entire app re-renders with dark theme

**localStorage write:**
```json
{
  "state": {
    "theme": "dark",
    "sidebarCollapsed": false,
    "textSize": 100,
    "locale": "en",
    // ... other preferences
  },
  "version": 0
}
```

**No server call:** Changes são purely client-side.

**Validation:** None needed (boolean value, can't be invalid).

**Error handling:**
- **localStorage quota exceeded (extremely rare):**
  - Browser shows warning (user storage almost full)
  - App still applies theme (works during session)
  - Toast: "Unable to save preferences. Your browser storage is full."
  - Workaround: User clears browser data → Try again
- **localStorage disabled (private browsing some browsers):**
  - Preferences work during session (não persisted)
  - Toast: "Preferences will not be saved (private browsing mode)"

---

### CLIENT-SIDE: Update Sidebar Collapsed

**Action:** User toggles Collapse Sidebar switch

**Client logic:**
1. User clicks Switch component
2. `onCheckedChange` handler fires
3. Calls `setSidebarCollapsed(true)` (Zustand)
4. Zustand updates state: `sidebarCollapsed: true`
5. Zustand persist middleware auto-saves to localStorage
6. Sidebar component re-renders (width: 240px → 64px)
7. Transition animation plays (smooth width change)
8. Content area expands (more horizontal space)

**localStorage write:**
```json
{
  "state": {
    "sidebarCollapsed": true,
    "theme": "light",
    "textSize": 100,
    "locale": "en",
    // ... other preferences
  },
  "version": 0
}
```

**No server call:** Changes são purely client-side.

**Validation:** None needed (boolean value).

**Error handling:** Same as Dark Mode (localStorage quota/disabled).

---

### CLIENT-SIDE: Update Text Size

**Action:** User drags Text Size slider

**Client logic:**
1. User drags slider thumb (or clicks on slider track)
2. `onValueChange` handler fires with value [0-3]
3. Maps slider index to percentage: `textSizeOptions[value[0]]`
   - 0 → 87.5%
   - 1 → 100%
   - 2 → 112.5%
   - 3 → 125%
4. Calls `setTextSize(112.5)` (example)
5. Zustand updates state: `textSize: 112.5`
6. Zustand persist middleware auto-saves to localStorage
7. Immediately applies: `document.documentElement.style.fontSize = '112.5%'`
8. All text in app scales up (uses rem units)
9. Label updates: "Default" → "Large"

**localStorage write:**
```json
{
  "state": {
    "textSize": 112.5,
    "theme": "light",
    "sidebarCollapsed": false,
    "locale": "en",
    // ... other preferences
  },
  "version": 0
}
```

**No server call:** Changes são purely client-side.

**Validation:** Slider component restricts values to [0, 1, 2, 3] → Always valid.

**Error handling:** Same as above.

**On mount behavior:**
- `useEffect` reads `textSize` from store
- Applies to `document.documentElement.style.fontSize`
- Ensures persisted size is applied on page load

---

### CLIENT-SIDE: Update Language (Locale)

**Action:** User selects language in Topbar dropdown

**Important:** This action happens in **Topbar**, not Settings page!

**Client logic:**
1. User clicks language dropdown (Topbar, top-right)
2. User clicks "Português" (example)
3. `handleLocaleChange('pt')` fires
4. Calls `setLocalePreference('pt')` (Zustand)
5. Zustand updates state: `locale: 'pt'`
6. Zustand persist middleware auto-saves to localStorage
7. `useStrings()` hook detects locale change
8. Entire app re-renders with Portuguese strings
9. Topbar dropdown shows: 🇧🇷 PT (selected)

**localStorage write:**
```json
{
  "state": {
    "locale": "pt",
    "theme": "light",
    "sidebarCollapsed": false,
    "textSize": 100,
    // ... other preferences
  },
  "version": 0
}
```

**No server call:** Changes são purely client-side.

**Validation:** Dropdown restricts values to ['en', 'pt', 'es'] → Always valid.

**Error handling:** Same as above.

**Translation system:**
- `/src/app/content/strings.ts` has 3 translation tables (en, pt, es)
- `useStrings()` hook reads `locale` from Zustand store
- Returns `t(key)` function that looks up string in correct locale table
- All components use `t('nav.overview')` instead of hardcoded strings
- Locale change triggers re-render → All strings update

---

### CLIENT-SIDE: Reset All Preferences

**Action:** User clicks "Reset to Defaults" button

**Client logic:**
1. User clicks Button (outline variant, bottom of page)
2. `onClick` handler fires
3. Calls `resetPreferences()` (Zustand action)
4. Zustand sets state to `defaultPreferences`:
   ```typescript
   {
     sidebarCollapsed: false,
     theme: 'light',
     locale: 'en',
     textSize: 100,
     favoriteViews: [],
     defaultView: 'dashboard',
     lastVisitedView: 'dashboard',
     onboardingStep: 0,
     onboardingSteps: {
       kyc: 'pending',
       mfa: 'pending',
       template: 'pending',
       checkout: 'pending',
     },
     dismissedBanners: [],
   }
   ```
5. Zustand persist middleware auto-saves to localStorage
6. App re-renders:
   - Theme → Light mode
   - Sidebar → Expanded
   - Text size → 100% (Default)
   - Language → English
   - Topbar updates: ☀️ Sun icon, 🇬🇧 EN
   - All strings → English
7. (Futuro) Toast: "Settings reset to defaults"

**localStorage write:**
```json
{
  "state": {
    "sidebarCollapsed": false,
    "theme": "light",
    "locale": "en",
    "textSize": 100,
    "favoriteViews": [],
    "defaultView": "dashboard",
    "lastVisitedView": "dashboard",
    "onboardingStep": 0,
    "onboardingSteps": {
      "kyc": "pending",
      "mfa": "pending",
      "template": "pending",
      "checkout": "pending"
    },
    "dismissedBanners": []
  },
  "version": 0
}
```

**No server call:** Changes são purely client-side.

**No confirmation modal:** Immediately resets (user can re-customize easily).

**Error handling:** Same as above (localStorage quota/disabled).

**Use case:**
- User experimented with settings (dark mode, collapsed sidebar, large text, Spanish)
- Now wants factory defaults (clean slate)
- Clicks "Reset to Defaults" → Everything back to initial state

---

### **localStorage Error Scenarios**

#### 1. **Quota Exceeded (Storage Full)**

**Cause:** User's browser localStorage is almost full (5-10MB limit, varies by browser).

**Symptoms:**
- `localStorage.setItem()` throws `QuotaExceededError`
- Preferences changes apply during session but não persist
- After page refresh, preferences revert to old values

**Handling:**
```typescript
try {
  localStorage.setItem('cqrs-dashboard-preferences', JSON.stringify(state));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    toast.error('Unable to save preferences. Your browser storage is full.');
    console.error('localStorage quota exceeded:', error);
  }
}
```

**User action:**
- Clear browser data (Settings → Privacy → Clear browsing data)
- Remove unused browser extensions (some use localStorage)
- Try again

**Likelihood:** Very rare (preferences são small, ~5KB max).

---

#### 2. **localStorage Disabled (Private Browsing)**

**Cause:** Some browsers disable localStorage in private/incognito mode.

**Symptoms:**
- `localStorage.setItem()` throws `SecurityError` or silently fails
- Preferences work during session (in-memory Zustand state)
- After closing tab, preferences are lost

**Handling:**
```typescript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (error) {
  toast.warning('Preferences will not be saved (private browsing mode)');
  console.warn('localStorage unavailable:', error);
}
```

**User action:**
- Use normal browsing mode (not private/incognito)
- Preferences will persist após restart

**Likelihood:** Uncommon (most users use normal browsing).

---

#### 3. **localStorage Corrupted (Invalid JSON)**

**Cause:** Browser crash during write, manual edit in DevTools, extension interference.

**Symptoms:**
- `JSON.parse()` throws `SyntaxError` on load
- Preferences página mostra defaults (não persisted values)

**Handling:**
```typescript
try {
  const stored = localStorage.getItem('cqrs-dashboard-preferences');
  const parsed = JSON.parse(stored || '{}');
  return parsed.state || defaultPreferences;
} catch (error) {
  console.error('Failed to parse preferences, resetting to defaults:', error);
  localStorage.removeItem('cqrs-dashboard-preferences');
  return defaultPreferences;
}
```

**User action:** None needed (auto-resets to defaults).

**Likelihood:** Very rare (requires external interference).

---

## Guia interno do produto

### Quando usar

Users acessam App Settings quando:

1. **First-time setup:** Configurar preferências iniciais (dark mode if trabalha à noite, text size if visão ruim)
2. **Environment change:** Moved from dark office → bright office (toggle dark mode)
3. **Accessibility needs:** Vision impairment → Increase text size to Extra Large
4. **Screen real estate:** Small laptop → Collapse sidebar para more content space
5. **Language preference:** Brazilian user → Switch to Português, Spanish user → Español
6. **Troubleshooting:** Settings messed up → Reset to Defaults
7. **Demonstration:** Showing dashboard to client → Adjust settings para better presentation
8. **Experimentation:** Trying different layouts → Find optimal configuration

**Frequency:** LOW (users configure once, rarely change)

---

### Settings Overview (Quick Reference)

| Setting | Default | Options | Location | Affects |
|---------|---------|---------|----------|---------|
| **Dark Mode** | Light | Light, Dark | Settings → Appearance | Entire app (all pages, components) |
| **Collapse Sidebar** | Expanded | Expanded, Collapsed | Settings → Layout | Sidebar width (240px ↔ 64px) |
| **Text Size** | 100% (Default) | 87.5% (Small), 100% (Default), 112.5% (Large), 125% (Extra Large) | Settings → Accessibility | All text em todo dashboard |
| **Language** | English | 🇬🇧 English, 🇧🇷 Português, 🇪🇸 Español | Topbar dropdown (NOT Settings) | All strings (navigation, labels, messages) |

---

### Dark Mode Explained

**Light Mode (Default):**
- **Background:** White/cream tones (warm, wabi-sabi)
- **Text:** Dark gray/black
- **Accent:** Orange/yellow (Crossramp brand)
- **Best for:** Bright office environments, daytime work
- **Eye strain:** Lower em ambientes bem iluminados

**Dark Mode:**
- **Background:** Dark gray/charcoal
- **Text:** Light gray/white
- **Accent:** Orange/yellow (maintains brand, higher contrast)
- **Best for:** Dark environments, night work, reduced blue light
- **Eye strain:** Lower em ambientes escuros (reduz brilho)

**System preference detection:** (Future enhancement)
- Auto-detect OS theme (Windows/Mac dark mode setting)
- Default to system preference on first visit
- User can override manually

**When to recommend:**
- **Light mode:** Office workers, daytime trading, shared screens
- **Dark mode:** Night shifts, prolonged screen time, OLED monitors (energy saving)

---

### Sidebar Collapsed Explained

**Expanded (Default):**
- **Width:** 240px
- **Shows:** Icons + text labels
- **Navigation:** Clear labels (easy to find pages)
- **Best for:** New users, infrequent users, large monitors

**Collapsed:**
- **Width:** 64px
- **Shows:** Icons only (text labels hidden)
- **Tooltips:** Hover shows label (e.g., hover "💳" → "Payments")
- **Navigation:** Requires familiarity with icons
- **Best for:** Power users, small screens (laptops <14"), more content space

**Auto-behavior:**
- **Mobile (<768px):** Always collapsed (hamburger menu)
- **Desktop (≥768px):** User choice (persisted preference)

**When to recommend:**
- **Expanded:** New users learning dashboard, infrequent logins, demos
- **Collapsed:** Daily users (know icons), small laptop screens, traders (need chart space)

---

### Text Size Explained

**Small (87.5%):**
- **Use case:** Power users, traders, data analysts
- **Benefit:** More content visible (tables show more rows, charts bigger)
- **Drawback:** Harder to read (eye strain after long hours)
- **Recommendation:** Users com good vision, want content density

**Default (100%):**
- **Use case:** Majority of users (optimized balance)
- **Benefit:** Readable + efficient (good content density)
- **Standard:** WCAG 2.1 AA compliant (accessibility baseline)
- **Recommendation:** Default para new users (best starting point)

**Large (112.5%):**
- **Use case:** Users com mild vision impairment, long work sessions
- **Benefit:** Easier to read (less eye strain)
- **Drawback:** Slightly less content visible (acceptable trade-off)
- **Recommendation:** Users 40+ years old, work >8 hours/day

**Extra Large (125%):**
- **Use case:** Accessibility compliance, low vision users
- **Benefit:** Maximum readability (WCAG 2.1 AAA level)
- **Drawback:** Significantly less content (tables show fewer rows)
- **Recommendation:** Senior users, legal compliance (accessibility laws)

**Responsive behavior:**
- Text size applies to **all breakpoints** (mobile, tablet, desktop)
- Mobile devices may override (browser zoom, system font size)
- Recommendation: Test em actual device (125% on mobile = very large)

---

### Language Selector Explained

**English (Default):**
- **Code:** EN
- **Flag:** 🇬🇧
- **Region:** Global (international standard)
- **Use case:** Non-Portuguese/Spanish speakers, demos, documentation

**Português:**
- **Code:** PT
- **Flag:** 🇧🇷 (Brazilian Portuguese, not Portugal 🇵🇹)
- **Region:** Brazil (primary market for PIX payments)
- **Use case:** Brazilian merchants (majority of Crossramp users)
- **Dialect:** BR Portuguese (não European Portuguese)

**Español:**
- **Code:** ES
- **Flag:** 🇪🇸
- **Region:** Spain flag, but content é Latin American Spanish
- **Use case:** Latin American merchants (Mexico, Colombia, Argentina, etc.)
- **Dialect:** Neutral Spanish (avoids regional slang)

**Translation quality:**
- **English:** Native, original content
- **Portuguese:** Native BR Portuguese (professional translation)
- **Spanish:** Native LATAM Spanish (professional translation)

**Incomplete translations:**
- All strings currently translated (no fallbacks to English)
- If new features added: English first → PT/ES later (may show English temporarily)

---

### Reset to Defaults Button

**When to use:**
- User experimented with settings → Wants clean slate
- Troubleshooting: "Dashboard looks weird" → Reset fixes unknown issues
- Demo mode: After demonstration → Reset para production settings
- Handoff: User leaving company → Reset para next user (device stays)

**What it resets:**
- ✅ Dark Mode → Light
- ✅ Sidebar → Expanded
- ✅ Text Size → 100% (Default)
- ✅ Language → English
- ✅ Favorite Views → Empty array
- ✅ Default View → Dashboard
- ✅ Onboarding Steps → All pending (progress bar reappears!)
- ✅ Dismissed Banners → Empty (KYC banner reappears se not verified)

**What it does NOT reset:**
- ❌ User account (still logged in)
- ❌ Backend data (templates, payments, balances)
- ❌ Security settings (MFA, API keys)
- ❌ Browser cache/cookies (separate from preferences)

**No confirmation modal:**
- Immediate reset (no "Are you sure?" dialog)
- Rationale: Easy to undo (just re-configure settings)
- Not destructive (no data loss, just UX preferences)

**After reset:**
- User still logged in (session intact)
- Dashboard reverts to default appearance
- KYC banner may reappear (if `dismissedBanners` reset)
- Onboarding progress bar may reappear (if `onboardingStep` reset)

---

### Preferences Store (Technical)

**Zustand store:** `/src/app/store/userPreferences.ts`

**Persisted fields:**
```typescript
{
  sidebarCollapsed: boolean,
  theme: 'light' | 'dark',
  locale: 'en' | 'pt' | 'es',
  textSize: 87.5 | 100 | 112.5 | 125,
  favoriteViews: string[],
  defaultView: string,
  lastVisitedView: string,
  onboardingStep: number,
  onboardingSteps: Record<OnboardingStepId, OnboardingStepStatus>,
  dismissedBanners: string[],
}
```

**NOT persisted:**
- `lastRefreshTime` (ephemeral, no need to persist)

**localStorage key:** `cqrs-dashboard-preferences`

**Storage format:**
```json
{
  "state": { /* preferences object */ },
  "version": 0
}
```

**Middleware:** `zustand/middleware/persist` (auto-saves on every state change)

**Hydration:** On app load, Zustand reads localStorage → Hydrates store → Components render com persisted preferences

**Cross-tab sync:** Not implemented (known limitation, acceptable for UX preferences)

**Migration strategy:** (Future)
- Version field (`version: 0`) allows schema migrations
- If `version: 1` detected → Migrate old preferences to new schema
- Example: Add new preference → Default value for existing users

---

### Casos extremos

#### 1. **User clears browser data (loses preferences)**

**Cenário:** User accidentally clicks "Clear browsing data" em browser settings.

**Result:**
- localStorage wiped (preferences lost)
- Next visit: App loads com default preferences (Light mode, English, 100% text, Expanded sidebar)
- No error (seamless fallback to defaults)

**Solução:** User reconfigures preferences (1-2 min).

**Prevenção:** (Future) Opcional server sync (backup preferences to backend).

---

#### 2. **User switches browsers (preferences não sync)**

**Cenário:** User normally uses Chrome (configured Dark mode, PT language). Opens dashboard em Firefox.

**Result:**
- Firefox has separate localStorage (no shared preferences)
- Firefox loads default preferences (Light mode, English, etc.)
- Chrome still has original preferences (isolated storage)

**Solução:** User configures Firefox separately (preferences são device/browser-specific).

**Prevenção:** (Future) Server sync (login → Load preferences from backend).

---

#### 3. **User works on multiple devices (inconsistent UX)**

**Cenário:** User has Desktop (Dark mode, Collapsed sidebar) + Laptop (Light mode, Expanded sidebar).

**Result:**
- Each device has independent preferences (localStorage não sync across devices)
- User must configure each device separately

**Trade-off:**
- **Pro:** User may WANT different settings per device (Desktop = collapsed, Laptop = expanded)
- **Con:** User may WANT same settings everywhere (inconvenient to configure twice)

**Solução:** Document this behavior (let users know preferences are device-specific).

**Prevenção:** (Future) Server sync com device-override option (sync by default, opt-out per device).

---

#### 4. **User sets Extra Large text (125%) on mobile**

**Cenário:** User tem vision impairment, sets Text Size to Extra Large (125%) on mobile phone.

**Result:**
- Text size increases 25%
- Mobile layout may break (text overflow, buttons too large)
- Tables/charts may require excessive scrolling

**Recommendation:**
- Test Extra Large on mobile (ensure layout doesn't break)
- (Future) Responsive text size scaling (125% on mobile = 112.5% effective, clamped)

**Workaround:** User can adjust browser zoom separately (system-level accessibility).

---

#### 5. **User resets preferences accidentally**

**Cenário:** User clicks "Reset to Defaults" button por mistake.

**Result:**
- All preferences reset instantly (Dark mode → Light, PT → EN, etc.)
- No confirmation modal (no way to cancel)

**Solução:**
- User reconfigures preferences (annoying but not destructive)
- (Future) Confirmation modal: "Are you sure? This will reset all settings to defaults."

**Prevenção:** Add confirmation modal (reduce accidental resets).

---

#### 6. **Preferences conflict com system settings**

**Cenário:** User's OS is em Dark Mode (Windows/Mac system preference). Dashboard defaults to Light Mode.

**Result:**
- Jarring visual contrast (OS dark, dashboard light)
- User expects dashboard to match system theme

**Solução:** User manually enables Dark Mode em Settings.

**Prevenção:** (Future) Auto-detect system theme on first visit:
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = prefersDark ? 'dark' : 'light';
```

---

#### 7. **Language selector in Topbar, not Settings (UX confusion)**

**Cenário:** User expects language selector em Settings page (like other apps). Não encontra.

**Result:**
- User frustrated ("Where is language setting?")
- May not discover language selector em Topbar

**Solução:**
- Document this design decision (Topbar = quick access)
- (Future) Add language dropdown ALSO em Settings page (redundant but discoverable)

**Design rationale:**
- Topbar = always visible (no navigation needed)
- Quick access (1 click vs. 2 clicks to Settings page)
- Frequent use case (bilingual users, demos)

---

#### 8. **User wants custom text size (e.g., 110%)**

**Cenário:** User wants text size between Default (100%) and Large (112.5%).

**Result:**
- Slider only has 4 steps (87.5%, 100%, 112.5%, 125%)
- User cannot select 110% (not an option)

**Solução:** User picks closest option (100% or 112.5%).

**Prevenção:** (Future) Continuous slider (any value 75%-150%) instead of discrete steps.

**Design rationale:**
- 4 steps = simple, clear labels (Small, Default, Large, Extra Large)
- Continuous slider = confusing (what is 103%? No label)
- Most users pick presets anyway (rarely want custom values)

---

#### 9. **Browser extension interferes com localStorage**

**Cenário:** User has browser extension that blocks localStorage writes (privacy extension, ad blocker).

**Result:**
- Preferences changes apply during session (in-memory Zustand state)
- After page refresh, preferences revert (não persisted)

**Symptoms:**
- User sets Dark Mode → Refreshes page → Back to Light Mode
- User confused: "Settings não save"

**Solução:**
- Disable privacy extension temporarily → Configure preferences → Re-enable extension
- (Future) Toast warning: "Unable to save preferences (localStorage blocked by extension)"

**Detection:**
```typescript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (error) {
  console.error('localStorage unavailable:', error);
  toast.warning('Preferences may not be saved (blocked by browser extension)');
}
```

---

#### 10. **User wants Dark Mode ONLY for Analytics page**

**Cenário:** User wants Light Mode for most pages, but Dark Mode for Analytics (easier to see charts).

**Result:**
- Dark Mode applies to **entire app** (cannot be page-specific)
- User must toggle Dark Mode manually quando switches pages (inconvenient)

**Solução:** User accepts global Dark Mode or Light Mode (no page-specific themes).

**Prevenção:** (Future) Page-specific theme overrides (complex, not planned).

**Design rationale:**
- Consistent UX (same theme throughout app)
- Simpler implementation (global CSS variables)
- Users can toggle theme easily (Topbar button sempre visible)

---

### Notas para Ops/CS

#### Troubleshooting comum

**"Minhas configurações não salvam"**
- **Verificar:**
  1. Private browsing mode? (localStorage disabled)
  2. Browser extension blocking localStorage? (privacy tools)
  3. Browser storage full? (quota exceeded, raro)
- **Solução:** 
  - Use normal browsing mode
  - Disable extensions temporarily
  - Clear browser data (free up storage)

**"Meu dashboard voltou para inglês"**
- **Causa:** User reset preferences or cleared browser data (lost locale setting).
- **Solução:** Topbar → Language dropdown → Select Português/Español.
- **Prevenção:** Document que reset preferences afeta language.

**"Sidebar está colapsado e não consigo expandir"**
- **Causa:** User enabled Collapse Sidebar em Settings, esqueceu como voltar.
- **Solução:** Settings → Layout → Toggle "Collapse Sidebar" OFF.
- **Alternative:** Hover sidebar items (tooltips mostram labels).

**"Texto muito pequeno, não consigo ler"**
- **Solução:** Settings → Accessibility → Text Size slider → Drag to "Large" or "Extra Large".
- **Browser alternative:** Browser zoom (Ctrl/Cmd + Plus).

**"Como voltar para configurações padrão?"**
- **Solução:** Settings → Scroll to bottom → Click "Reset to Defaults" button.
- **Aviso:** This resets ALL settings (theme, language, text size, sidebar, etc.).

**"Quero dark mode apenas para Analytics"**
- **Resposta:** Dark Mode é global (aplica a todas as páginas). Não há page-specific themes.
- **Workaround:** Toggle Dark Mode quando entra/sai de Analytics (Topbar button).

**"Minhas configurações sumiram após limpar cache"**
- **Explicar:** Preferences são armazenadas em localStorage (browser storage). Clear cache/data → Perde preferences.
- **Solução:** Reconfigure em Settings (leva 1-2 min).
- **Prevenção:** (Future) Server sync (backup to backend).

**"Dark mode no laptop, light mode no celular — normal?"**
- **Resposta:** Sim! Preferences são device-specific (cada device tem own localStorage).
- **Explicar:** Configure cada device separadamente (pode ter different settings se preferir).

**"Configurei português mas voltou para inglês"**
- **Causa:** Reset preferences or cleared browser data.
- **Solução:** Topbar → Language dropdown → Português.
- **Verificar:** Settings → If "Reset to Defaults" clicked (resets language to EN).

---

### Melhorias futuras

1. **System Theme Auto-Detection:** Detect OS dark/light mode → Default to system preference
2. **Server Sync (Opcional):** Backup preferences to backend → Sync across devices
3. **Custom Text Size:** Continuous slider (75%-150%) instead of 4 discrete steps
4. **Page-Specific Themes:** Dark mode for Analytics, light mode for Payments (advanced)
5. **Confirmation Modal:** "Reset to Defaults" button shows "Are you sure?" dialog
6. **Preference History:** Undo/redo changes (like Photoshop history)
7. **Preset Profiles:** "Power User" profile (collapsed sidebar, small text, dark mode)
8. **Language em Settings:** Redundant language selector em Settings page (além de Topbar)
9. **High Contrast Mode:** Accessibility toggle (WCAG AAA compliance)
10. **Reduced Motion:** Disable animations (accessibility, motion sickness)
11. **Compact Mode:** Reduce spacing para content density (show more data)
12. **Chart Color Themes:** Crossramp, Vibrant, Muted, Monochrome (visual customization)
13. **Date Format:** Relative ("2 hours ago") vs. Absolute ("Jan 15, 2024")
14. **Number Format:** Compact ("1.2K") vs. Full ("1,234")
15. **Cross-Tab Sync:** Preferences changes em outra tab update current tab (localStorage events)
16. **Export/Import Preferences:** JSON file download/upload (backup, share with team)
17. **Keyboard Shortcuts:** Hotkeys for common actions (Ctrl+D = toggle dark mode)
18. **Preference Presets:** "Accessibility Mode" (large text, high contrast, reduced motion)

---

### Best practices para compartilhar com Users

1. **Configure once, forget:** Settings persist across sessions (no need to reconfigure every login).
2. **Experiment freely:** Changes são reversible (Reset to Defaults button se messed up).
3. **Device-specific is OK:** Laptop pode ter different settings than Desktop (both valid).
4. **Dark mode for night work:** Reduce eye strain em ambientes escuros.
5. **Collapsed sidebar for small screens:** More horizontal space para content (laptops <14").
6. **Large text for long sessions:** Reduce eye fatigue (recommended for 40+ years old).
7. **Language matches team:** Se team é Brazilian → Português, Latin American → Español.
8. **Reset after demos:** If showed dashboard to client → Reset to personal preferences.
9. **Don't clear browser data:** Loses preferences (unless intentional).
10. **Report bugs:** If settings não save → Contact support (may be browser extension issue).

---

### Accessibility Compliance

**WCAG 2.1 Level AA (Current):**
- ✅ Text Size Default (100%) = AA compliant
- ✅ Dark Mode = AA contrast ratios
- ✅ Keyboard navigation (all controls tabbable)
- ✅ Screen reader support (labels, ARIA attributes)

**WCAG 2.1 Level AAA (Future with Extra Large):**
- ✅ Text Size Extra Large (125%) = AAA compliant
- ⚠️ High Contrast Mode (not implemented yet)
- ⚠️ Reduced Motion (not implemented yet)

**Recommendations:**
- **Default users:** 100% text size (AA baseline)
- **Accessibility compliance:** 125% text size (AAA level)
- **Future:** Add High Contrast + Reduced Motion toggles (full AAA compliance)

---

### Security Considerations

**No MFA required:**
- Preferences são UX-only (não affect transactional data)
- No financial impact (não create payments, withdrawals, etc.)
- Low security risk (worst case: user prefers dark mode)

**Client-side only:**
- No backend queries/commands (no server state)
- Cannot expose sensitive data (preferences são local)
- No CSRF/XSS risk (no API calls)

**localStorage security:**
- localStorage is domain-specific (cannot be read by other sites)
- Stored em plain text (acceptable for non-sensitive UX preferences)
- No encryption needed (no PII or credentials stored)

**Future server sync concerns:**
- If preferences sync to backend → Requires authentication (JWT token)
- Preferences payload must be validated (prevent injection attacks)
- Rate limiting (prevent spam requests)

---

### Product Philosophy: Progressive Disclosure

**Settings page = Simple by design:**
- Only 3 cards (Appearance, Layout, Accessibility)
- Only 3 active settings (Dark Mode, Sidebar, Text Size)
- Language selector hidden em Topbar (quick access, não clutter Settings)
- Advanced settings (Chart Themes, Date Format, etc.) **not shown** (future features, progressively disclosed quando needed)

**Why simple?**
- Users não overwhelmed (clear, focused options)
- Most users only need: Dark Mode, Text Size, Language
- Advanced users can explore later (if we add more settings)

**Wabi-sabi philosophy:**
- Embrace imperfection (não every possible setting, just essential ones)
- Minimal friction (no confirmation modals, instant save)
- Warm defaults (Light mode, orange accents, readable text)

**Progressive disclosure:**
- Start simple (3 settings)
- Add complexity gradually (future: Chart Themes, Compact Mode, etc.)
- Users discover features quando needed (not forced upfront)
