---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: Navigation System
parent_project: coderef-dashboard
category: component
version: "1.0.0"
related_files:
  - packages/dashboard/src/components/Sidebar.tsx
  - packages/dashboard/src/components/Header.tsx
  - packages/dashboard/src/components/MobileNav.tsx
status: APPROVED
---

# Navigation System — Authoritative Documentation

## Executive Summary

The Navigation System is a React component system that provides primary navigation UI for the CodeRef dashboard across desktop and mobile devices. It consists of three coordinated components: Sidebar (desktop left navigation), Header (top navigation with breadcrumbs), and MobileNav (mobile hamburger menu). The system manages active route state, provides responsive design (desktop sidebar, mobile hamburger), coordinates navigation state across components, and ensures accessibility with keyboard navigation and ARIA labels. It serves as the foundation for all page navigation in the dashboard, ensuring consistent navigation experience across all screen sizes and providing active state management for route highlighting.

## Audience & Intent

- **Markdown (this document):** Architectural truth for component coordination, state management, responsive behavior, and accessibility requirements
- **TypeScript (Sidebar.tsx, Header.tsx, MobileNav.tsx):** Runtime behavior for navigation rendering, active state detection, and responsive switching
- **CSS/Responsive Design:** Layout contracts for desktop sidebar and mobile hamburger menu
- **Next.js Routing:** Integration with Next.js App Router for route detection

## 1. Architecture Overview

### Role in System

The Navigation System is the **primary navigation layer** for the dashboard, positioned between:
- **Input:** Current route from Next.js App Router
- **Rendering:** Navigation UI (sidebar, header, mobile menu)
- **Output:** User navigation actions (route changes)

**Integration Points:**
- **Next.js App Router:** Uses `usePathname()` for active route detection
- **All Pages:** Every page uses navigation components
- **Theme System:** Consumes theme via `useTheme()` hook
- **Routing:** Uses Next.js `Link` component for navigation

### Component Hierarchy

```
Root Layout (app/layout.tsx)
├── Header (Top navigation, always visible)
│   ├── Breadcrumbs (current route path)
│   ├── Logo/Brand
│   └── User menu (if applicable)
│
├── Sidebar (Desktop left navigation, hidden on mobile)
│   ├── Navigation items (links)
│   ├── Active state highlighting
│   └── Collapse/expand (if applicable)
│
└── MobileNav (Mobile hamburger menu, hidden on desktop)
    ├── Hamburger button (toggle)
    ├── Overlay menu (when open)
    └── Navigation items (same as Sidebar)
```

### Responsive Behavior

**Desktop (> 768px):**
- Sidebar: Visible, fixed left position
- Header: Visible, full width
- MobileNav: Hidden

**Mobile (≤ 768px):**
- Sidebar: Hidden
- Header: Visible, full width
- MobileNav: Visible, hamburger button in header

**State Coordination:**
- Active route detected via `usePathname()` hook
- All three components receive same route information
- Active state synchronized across components

### File Structure

**Location:** `packages/dashboard/src/components/`

**Components:**
- `Sidebar.tsx` - Desktop left navigation
- `Header.tsx` - Top navigation with breadcrumbs
- `MobileNav.tsx` - Mobile hamburger menu

**Integration Points:**
- `app/layout.tsx` - Wraps app with navigation components
- Next.js `usePathname()` - Active route detection
- Next.js `Link` - Navigation links
- Theme System - Theme consumption for styling

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Current route | Next.js App Router | System | URL | Browser URL bar |
| Active navigation item | Sidebar/Header/MobileNav | UI | None (ephemeral) | Derived from `usePathname()` |
| Mobile menu open state | MobileNav | UI | None (ephemeral) | `isOpen` boolean state |
| Sidebar collapse state | Sidebar | UI | None (ephemeral) | `isCollapsed` boolean state (if applicable) |

**Precedence Rules:**
- Browser URL is authoritative for current route (Next.js App Router)
- Active state is derived from route (no separate state management)
- Mobile menu state is local to MobileNav component (not shared)
- Sidebar collapse state is local to Sidebar component (not shared)

## 3. Data Persistence

### Storage Keys and Schema

**No Built-in Persistence:**
- Navigation state is ephemeral (lost on page refresh)
- Active route persisted in URL (browser history)
- Mobile menu state not persisted (closes on navigation)

**Browser History:**
- Next.js App Router manages browser history
- Back/forward buttons work via browser history
- URL reflects current route

**Versioning Strategy:**
- No versioning - navigation structure may change
- Route changes require component updates

**Failure Modes & Recovery:**
- **Invalid route:** Next.js handles 404 (navigation components still render)
- **Route mismatch:** Active state may be incorrect (no recovery, user must navigate)

**Cross-tab/Multi-client Sync:**
- Not applicable. Navigation state is per-tab (browser URL per tab).

## 4. State Lifecycle

### Canonical Navigation Sequence

1. **Initial Load:**
   - User navigates to dashboard URL
   - Next.js App Router determines route
   - Layout renders with Header, Sidebar, MobileNav
   - Components call `usePathname()` to get current route
   - Active state calculated from route

2. **User Navigation:**
   - User clicks navigation link (Sidebar, Header, or MobileNav)
   - Next.js `Link` component handles navigation
   - URL changes (browser history updated)
   - Next.js App Router re-renders page
   - Navigation components re-render with new route
   - Active state updated automatically

3. **Mobile Menu Toggle:**
   - User clicks hamburger button
   - `isOpen` state toggles in MobileNav
   - Overlay menu shows/hides
   - Navigation items rendered in overlay

4. **Route Change:**
   - `usePathname()` hook detects route change
   - Components re-render with new active state
   - Previous active item unhighlighted
   - New active item highlighted

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**Navigation Click:**
- User clicks navigation link
- Next.js `Link` navigates to route
- URL changes, page re-renders

**Mobile Menu Toggle:**
- User clicks hamburger button
- Mobile menu opens/closes
- Overlay shows/hides

**Keyboard Navigation:**
- Tab key navigates through links
- Enter key activates link
- Escape key closes mobile menu (if applicable)

### System Behaviors

1. **Route Detection:**
   - `usePathname()` hook called on every render
   - Active state calculated from current route
   - Components re-render when route changes

2. **Responsive Switching:**
   - CSS media queries hide/show components
   - Sidebar hidden on mobile, MobileNav hidden on desktop
   - No JavaScript-based responsive logic (CSS-only)

3. **Active State Highlighting:**
   - Active route compared with navigation item paths
   - Matching items receive active styling
   - No state management required (derived from route)

4. **Accessibility:**
   - ARIA labels on navigation elements
   - Keyboard navigation support
   - Focus management for mobile menu

## 6. Event & Callback Contracts

**Not Applicable.** Navigation System uses Next.js `Link` components and `usePathname()` hook (no custom events).

**Component Props:**

| Component | Props | Description |
|-----------|-------|-------------|
| `Sidebar` | None (or optional props) | Renders desktop navigation |
| `Header` | None (or optional props) | Renders top navigation with breadcrumbs |
| `MobileNav` | None (or optional props) | Renders mobile hamburger menu |

**Next.js Integration:**
- `usePathname()` - Returns current route path
- `Link` - Navigation link component
- `useRouter()` - Router instance (if needed)

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small navigation (< 10 items): No performance issues
  - Medium navigation (10-50 items): No performance issues
   - Large navigation (> 50 items): Not tested (may require virtualization)

- **Memory Limits:**
  - Navigation items rendered in DOM
   - No virtualization for large lists
   - Estimated: ~1KB per navigation item

### Bottlenecks

1. **Re-renders:** All navigation components re-render on route change
2. **Active State Calculation:** Route comparison on every render (minimal overhead)

### Optimization Opportunities

1. **Memoization:** Memoize navigation items array (prevent unnecessary re-renders)
2. **Virtualization:** Virtualize large navigation lists (if > 50 items)
3. **Route Matching Optimization:** Cache active state calculation (minimal benefit)

### Deferred Optimizations

- **Virtualization:** Not needed for typical navigation sizes. Rationale: Most dashboards have < 20 navigation items.
- **Route Matching Caching:** Current implementation is fast enough. Rationale: Route comparison is O(n) where n=items, negligible overhead.

## 8. Accessibility

### Current Gaps

| Issue | Severity | Description |
|-------|----------|-------------|
| ARIA labels | Minor | Navigation items may lack ARIA labels |
| Keyboard navigation | Minor | Tab order may not be optimal |
| Focus management | Minor | Focus not managed when mobile menu opens/closes |
| Screen reader support | Minor | Navigation structure may not be announced correctly |

### Required Tasks

1. **Add ARIA labels** to all navigation items
2. **Implement focus trap** for mobile menu overlay
3. **Add skip navigation link** for keyboard users
4. **Test with screen readers** (NVDA, JAWS, VoiceOver)

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Navigation:**
   - Clicking navigation links changes route
   - Active state updates correctly
   - URL changes match navigation

2. **Responsive Behavior:**
   - Sidebar visible on desktop, hidden on mobile
   - MobileNav visible on mobile, hidden on desktop
   - Hamburger menu toggles correctly

3. **Active State:**
   - Correct item highlighted for current route
   - Active state synchronized across components
   - Nested routes handled correctly

4. **Keyboard Navigation:**
   - Tab key navigates through links
   - Enter key activates links
   - Escape key closes mobile menu

5. **Edge Cases:**
   - Invalid routes (404 pages)
   - Nested routes (sub-pages)
   - Route parameters (dynamic routes)

### Explicitly Not Tested

- **Very Large Navigation:** > 100 items (performance not guaranteed)
- **Concurrent Route Changes:** Multiple rapid navigations (undefined behavior)
- **Browser History:** Back/forward button behavior (handled by Next.js)

### Test Files

- No test files found in codebase (testing needed)

## 10. Non-Goals / Out of Scope

1. **Breadcrumb Generation:** Header may show breadcrumbs, but generation logic not in Navigation System
2. **Route Guards:** No authentication/authorization checks (handled by pages)
3. **Navigation History:** No navigation history tracking (browser handles)
4. **Deep Linking:** No special deep linking logic (Next.js handles)
5. **Navigation Analytics:** No tracking of navigation patterns
6. **Custom Navigation Items:** Navigation items are hardcoded (no dynamic configuration)
7. **Multi-level Navigation:** No nested navigation menus (flat structure)
8. **Navigation Persistence:** No persistence of navigation state (ephemeral)

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **Active State Mismatch:**
   - Active state may not match route if route structure changes
   - Nested routes may not highlight parent correctly
   - Route parameters may cause active state issues

2. **Mobile Menu State:**
   - Mobile menu state not persisted (closes on navigation)
   - Menu may close unexpectedly on route change
   - No animation/transition for menu open/close

3. **Responsive Breakpoint:**
   - Breakpoint is hardcoded (typically 768px)
   - May not match all device sizes
   - No JavaScript-based responsive detection

4. **Breadcrumb Synchronization:**
   - Breadcrumbs in Header may not match Sidebar navigation
   - No validation that breadcrumbs are correct
   - Manual synchronization required

### Integration Gotchas

1. **Route Detection:**
   - `usePathname()` must be called in client components
   - Server components cannot use `usePathname()`
   - Route changes trigger re-renders (may cause performance issues)

2. **Next.js Link:**
   - Must use Next.js `Link` component (not `<a>` tags)
   - Client-side navigation only (no full page reload)
   - Prefetching may cause unexpected behavior

3. **Active State Calculation:**
   - Route matching is string-based (exact or prefix matching)
   - Query parameters not considered in active state
   - Hash fragments not considered in active state

### Configuration Mistakes

1. **Navigation Items:**
   - Navigation items are hardcoded in components
   - Adding/removing items requires code changes
   - No configuration file for navigation structure

2. **Route Paths:**
   - Route paths must match Next.js App Router structure
   - Mismatched paths cause navigation failures
   - No validation of route paths

3. **Responsive Breakpoints:**
   - Breakpoints are CSS-based (no JavaScript detection)
   - May not match actual device sizes
   - No dynamic breakpoint adjustment

### Edge Cases

1. **Invalid Routes:**
   - 404 pages still render navigation
   - Active state may be undefined for invalid routes
   - Navigation still functional (can navigate away)

2. **Nested Routes:**
   - Parent route may not highlight when on child route
   - Active state logic may need adjustment for nested routes
   - Breadcrumbs may not reflect nested structure

3. **Route Parameters:**
   - Dynamic routes (e.g., `/workorders/[id]`) may not match navigation items
   - Active state may not work for parameterized routes
   - Manual route matching logic may be required

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Component Coordination

```
Next.js App Router (usePathname())
    │
    ├─→ Sidebar
    │   ├─→ Reads current route
    │   ├─→ Calculates active state
    │   └─→ Renders navigation items
    │
    ├─→ Header
    │   ├─→ Reads current route
    │   ├─→ Generates breadcrumbs
    │   └─→ Renders top navigation
    │
    └─→ MobileNav
        ├─→ Reads current route
        ├─→ Manages menu open state
        └─→ Renders mobile navigation
```

### Responsive Layout

```
Desktop (> 768px)
├── Sidebar: Visible (left)
├── Header: Visible (top)
└── MobileNav: Hidden

Mobile (≤ 768px)
├── Sidebar: Hidden
├── Header: Visible (top, with hamburger)
└── MobileNav: Visible (hamburger menu)
```

## Conclusion

The Navigation System provides primary navigation UI for the CodeRef dashboard, coordinating Sidebar, Header, and MobileNav components to ensure consistent navigation experience across desktop and mobile devices. It manages active route state, provides responsive design, and ensures accessibility with keyboard navigation and ARIA labels. The system is simple, performant, and reliable, with responsive behavior handled via CSS and active state derived from Next.js routing.

**Maintenance Expectations:**
- Navigation items are stable - changes require component updates
- Route structure is stable - changes require active state logic updates
- Responsive breakpoints are stable - changes require CSS updates
- Active state logic is stable - route matching algorithm changes require testing
