---
Agent: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
Date: 2026-01-02
Task: DOCUMENT
---

# Data Flow Architecture — Authoritative Documentation

## Executive Summary

The Data Flow Architecture defines how CodeRef Dashboard collects, aggregates, and displays development resources from the file system without requiring database infrastructure. It orchestrates multi-project scanning via Next.js API routes, manages state through custom React hooks with window event refresh patterns, and renders data using a UnifiedCard-based component hierarchy. This document establishes the canonical contracts for data collection, state management, and UI rendering that enable the dashboard to visualize workorders, stubs, and documentation across unlimited projects.

## Audience & Intent

- **Markdown (this document):** Architectural truth for data flow sequences, state ownership, API contracts, and integration patterns
- **TypeScript (`types/*.ts`):** Compile-time contracts for API responses and domain objects
- **API Routes (`/api/*`):** Source of truth for file system scanning logic and data aggregation
- **React Hooks:** Runtime behavior for data fetching, caching, and event-driven refresh
- **Components:** UI rendering contracts and prop interfaces

---

## 1. Architecture Overview

### System Role

The Data Flow Architecture is the **backbone integration layer** that:
- Scans file systems across multiple projects for CodeRef resources
- Aggregates workorders, stubs, and documentation into unified collections
- Manages fetch lifecycle through custom hooks with loading/error states
- Provides event-driven refresh via window events
- Renders collections using component hierarchy with client-side filtering

### Component Hierarchy

```
File System (Multi-Project)
        ↓
[Next.js API Routes Layer]
├── GET /api/workorders
│   ├── Read projects.config.json
│   ├── Scan each project's coderef/workorder/* directories
│   ├── Parse communication.json, plan.json, DELIVERABLES.md
│   └── Return WorkorderListResponse
├── GET /api/stubs
│   ├── Read centralized stubs directory path
│   ├── Scan all stub.json files
│   └── Return StubListResponse
└── GET /api/projects
    └── Return projects.config.json

        ↓
[Custom Hooks Layer]
├── useWorkorders
│   ├── Fetch /api/workorders on mount
│   ├── Listen for 'refetch-workorders' events
│   └── Manage workorders[], isLoading, error, total, by_project, by_status
├── useStubs
│   ├── Fetch /api/stubs on mount
│   ├── Listen for 'refetch-stubs' events
│   └── Manage stubs[], isLoading, error, total
└── useProjects
    └── Fetch /api/projects for configuration

        ↓
[Component Rendering Layer]
├── WorkorderList
│   ├── Client-side filtering (search, status, project, priority)
│   ├── Map workorders[] → WorkorderCard[]
│   └── Loading/error/empty states
├── StubList
│   ├── Client-side filtering (search, status, priority, category)
│   ├── Map stubs[] → StubCard[]
│   └── Loading/error/empty states
└── UnifiedCard (base component)
    └── Renders title, description, badges, metadata
```

### Key Integration Points

| Integration | Direction | Contract |
|-------------|-----------|----------|
| File System → API | Data IN | Node.js `fs` module reads JSON files from configured paths |
| API → Hook | Data OUT | API returns `WorkorderListResponse` or `StubListResponse` |
| Hook → Component | State OUT | Hook provides `data[]`, `isLoading`, `error`, `total`, `refetch()` |
| Component → UI | Render | List maps data array to Card components |
| Window Events → Hook | Trigger | `refetch-workorders` / `refetch-stubs` events trigger re-fetch |
| FilterBar → List | Filter IN | `FilterConfig` object applies client-side filtering |

---

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|--------------------|
| `workorders[]` | useWorkorders hook | Domain Data | None (fetch) | API `/api/workorders` → File system |
| `stubs[]` | useStubs hook | Domain Data | None (fetch) | API `/api/stubs` → File system |
| `projects[]` | useProjects hook | Configuration | None (fetch) | API `/api/projects` → projects.config.json |
| `isLoading` (workorders) | useWorkorders hook | UI State | None | Hook internal state |
| `isLoading` (stubs) | useStubs hook | UI State | None | Hook internal state |
| `error` (workorders) | useWorkorders hook | UI State | None | Hook internal state |
| `error` (stubs) | useStubs hook | UI State | None | Hook internal state |
| `total` (workorders) | useWorkorders hook | Computed | None | Derived from `workorders.length` |
| `total` (stubs) | useStubs hook | Computed | None | Derived from `stubs.length` |
| `by_project` | useWorkorders hook | Computed | None | API aggregates counts per project |
| `by_status` | useWorkorders hook | Computed | None | API aggregates counts per status |
| Filtered data | List components | UI State | None | Computed from data[] + filters |
| Filter config | Parent components | UI State | Varies | FilterBar or page-level state |

### Precedence Rules

1. **File System Authority:** File system data is canonical - API never generates or modifies data
2. **No Client Caching:** Hooks refetch on every mount and manual refresh (no stale data)
3. **No Server Filtering:** API returns unfiltered results - filtering is client-side only
4. **Multi-Project Aggregation:** API merges data from all configured projects before returning
5. **Event-Driven Refresh:** Window events trigger hook refetch without page reload
6. **Component Isolation:** Each hook manages independent state - no cross-contamination

---

## 3. Data Persistence

**None at application level.** The dashboard is a read-only visualization layer.

**Data Sources:**
- **Workorders:** `{project.path}/coderef/workorder/{feature-name}/` directories
- **Stubs:** Centralized `stubs/` directory (configured in projects.config.json)
- **Projects:** `projects.config.json` at dashboard root

**Persistence Characteristics:**
| Resource | Storage | Format | Authority |
|----------|---------|--------|-----------|
| Workorder metadata | `communication.json` | JSON | File system |
| Implementation plan | `plan.json` | JSON | File system |
| Deliverables | `DELIVERABLES.md` | Markdown | File system |
| Stub data | `stub.json` | JSON | File system |
| Project config | `projects.config.json` | JSON | File system |

**Failure Modes:**
1. **API Unavailable:** Hook sets error state, component shows error message with retry button
2. **Malformed JSON:** API returns 500 error, hook propagates to UI
3. **Missing Directory:** API returns empty array (not error) - UI shows "No items found"
4. **Invalid Project Path:** API skips project silently, logs warning to console
5. **File Permission Error:** API returns error response, hook displays error state

**Recovery Paths:**
- User clicks Refresh button → dispatches window event → hook refetches
- Page remount → automatic refetch via useEffect
- Fix file system issue → manual refresh triggers scan

---

## 4. State Lifecycle

### 1. Initialization (Hook Mount)

```typescript
// useWorkorders.ts
const [workorders, setWorkorders] = useState<WorkorderObject[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [total, setTotal] = useState(0);
const [byProject, setByProject] = useState<Record<string, number>>({});
const [byStatus, setByStatus] = useState<Record<string, number>>({});
```

### 2. Hydration (Data Fetch)

```typescript
useEffect(() => {
  fetchWorkorders(); // Runs on component mount
}, []);

const fetchWorkorders = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/workorders');
    if (!response.ok) throw new Error('Failed to fetch workorders');

    const data: WorkorderListResponse = await response.json();

    setWorkorders(data.data.workorders);
    setTotal(data.data.total);
    setByProject(data.data.by_project);
    setByStatus(data.data.by_status);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Validation

**None.** API response assumed to match TypeScript interface. No runtime validation layer.

**Trust Model:**
- API controls file scanning and parsing
- TypeScript ensures compile-time type safety
- Malformed data causes runtime errors (not gracefully handled)

### 4. Runtime Updates (Event-Driven Refresh)

```typescript
useEffect(() => {
  const handleRefetch = () => fetchWorkorders();
  window.addEventListener('refetch-workorders', handleRefetch);

  return () => {
    window.removeEventListener('refetch-workorders', handleRefetch);
  };
}, []);
```

### 5. Persistence Triggers

**None.** Dashboard is read-only - no mutations flow from UI to file system.

---

## 5. Data Flow Sequences

### Workorder Collection Flow

```
[User Opens Dashboard]
        ↓
Component mounts → useWorkorders() hook initializes
        ↓
useEffect fires → fetchWorkorders() called
        ↓
HTTP GET /api/workorders
        ↓
[API Route Handler]
├─ Read projects.config.json
├─ For each project in config:
│  ├─ Resolve project.path + project.workorder_dir
│  ├─ Scan directory for folders
│  ├─ For each folder:
│  │  ├─ Read communication.json
│  │  ├─ Read plan.json (if exists)
│  │  ├─ Read DELIVERABLES.md (if exists)
│  │  └─ Construct WorkorderObject
│  └─ Aggregate workorders from project
├─ Merge all projects → workorders[]
├─ Calculate total, by_project, by_status
└─ Return WorkorderListResponse
        ↓
[Hook Receives Response]
├─ setWorkorders(data.data.workorders)
├─ setTotal(data.data.total)
├─ setByProject(data.data.by_project)
├─ setByStatus(data.data.by_status)
└─ setIsLoading(false)
        ↓
[Component Re-Renders]
├─ WorkorderList receives workorders prop
├─ Apply client-side filters
├─ Map filtered array → WorkorderCard[]
└─ Render cards with UnifiedCard
```

### Stub Collection Flow

```
[User Opens Assistant Page]
        ↓
Component mounts → useStubs() hook initializes
        ↓
useEffect fires → fetchStubs() called
        ↓
HTTP GET /api/stubs
        ↓
[API Route Handler]
├─ Read centralized stubs directory path
├─ Scan directory for stub.json files
├─ For each stub.json:
│  ├─ Read file contents
│  ├─ Parse JSON
│  └─ Construct StubObject
├─ Aggregate all stubs → stubs[]
├─ Calculate total
└─ Return StubListResponse
        ↓
[Hook Receives Response]
├─ setStubs(data.data.stubs)
├─ setTotal(data.data.total)
└─ setIsLoading(false)
        ↓
[Component Re-Renders]
├─ StubList receives stubs prop
├─ Apply client-side filters
├─ Map filtered array → StubCard[]
└─ Render cards with UnifiedCard
```

### Refresh Flow (Event-Driven)

```
[User Clicks Refresh Button]
        ↓
Button onClick handler executes:
window.dispatchEvent(new Event('refetch-workorders'));
        ↓
[Window Event Dispatched]
        ↓
useWorkorders hook listener fires:
useEffect(() => {
  window.addEventListener('refetch-workorders', handleRefetch);
}, []);
        ↓
handleRefetch() → fetchWorkorders()
        ↓
[Fetch Sequence Repeats]
├─ setIsLoading(true)
├─ HTTP GET /api/workorders
├─ API scans file system (fresh data)
├─ Hook updates state
└─ Component re-renders with new data
```

---

## 6. API Contracts

### GET /api/workorders

**Expected Response:**
```typescript
{
  success: boolean;
  data: {
    workorders: WorkorderObject[];
    total: number;
    by_project: Record<string, number>;  // { "project-alpha": 5, "project-beta": 3 }
    by_status: Record<string, number>;   // { "implementing": 4, "complete": 3, "pending_plan": 1 }
  };
  timestamp: string; // ISO 8601
}
```

**WorkorderObject Schema:**
```typescript
interface WorkorderObject {
  id: string;                    // Unique identifier (usually workorder_id)
  workorder_id: string;          // "WO-AUTH-001"
  feature_name: string;          // "auth-system"
  project_id: string;            // Links to projects.config.json
  project_name: string;          // Display name
  status: WorkorderStatus;       // Enum (8 stages)
  priority?: string;             // Optional priority
  assigned_agent?: string;       // Optional agent assignment
  created_at: string;            // ISO 8601
  updated_at?: string;           // ISO 8601
  plan_path?: string;            // Path to plan.json
  deliverables_path?: string;    // Path to DELIVERABLES.md
  progress?: number;             // 0-100 percentage
}
```

**Error Response:**
```typescript
{
  success: false;
  error: {
    message: string;
    code?: string;
  };
  timestamp: string;
}
```

### GET /api/stubs

**Expected Response:**
```typescript
{
  success: boolean;
  data: {
    stubs: StubObject[];
    total: number;
    location: string;  // Directory path scanned
  };
  timestamp: string; // ISO 8601
}
```

**StubObject Schema:**
```typescript
interface StubObject {
  id: string;                    // Unique identifier (usually feature-name)
  feature_name: string;          // Matches folder name
  title: string;                 // Display title
  description: string;           // Stub description
  category: StubCategory;        // 'feature' | 'fix' | 'improvement' | 'idea' | 'refactor' | 'test'
  priority: StubPriority;        // 'low' | 'medium' | 'high' | 'critical'
  status: StubStatus;            // 'stub' | 'planned' | 'in_progress' | 'completed'
  created: string;               // ISO 8601 timestamp
  updated: string;               // ISO 8601 timestamp
  path: string;                  // File system path to stub.json
  target_project?: string;       // Optional project association
}
```

### GET /api/projects

**Expected Response:**
```typescript
{
  success: boolean;
  data: {
    projects: ProjectConfig[];
  };
  timestamp: string;
}

interface ProjectConfig {
  id: string;
  name: string;
  path: string;                  // Absolute path to project root
  workorder_dir: string;         // Relative path to workorder directory
}
```

---

## 7. Hook Contracts

### useWorkorders Hook

**Exports:**
```typescript
interface UseWorkordersResult {
  workorders: WorkorderObject[];
  isLoading: boolean;
  error: string | null;
  total: number;
  byProject: Record<string, number>;
  byStatus: Record<string, number>;
  refetch: () => void;
}
```

**Behavior:**
- Fetches on mount (runs once)
- Listens for `refetch-workorders` window events
- Manages loading/error states internally
- Provides manual `refetch()` method
- No caching - always fetches fresh data

### useStubs Hook

**Exports:**
```typescript
interface UseStubsResult {
  stubs: StubObject[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => void;
}
```

**Behavior:**
- Fetches on mount (runs once)
- Listens for `refetch-stubs` window events
- Manages loading/error states internally
- Provides manual `refetch()` method
- No caching - always fetches fresh data

---

## 8. Component Rendering Contracts

### WorkorderList Component

**Props:**
```typescript
interface WorkorderListProps {
  workorders: WorkorderObject[];
  isLoading: boolean;
  error?: string | null;
  filters?: FilterConfig;
  onWorkorderClick?: (id: string) => void;
}
```

**Rendering Logic:**
```typescript
// Apply filters (client-side)
const filteredWorkorders = workorders.filter(workorder => {
  // Search filter
  if (filters.search) {
    const query = filters.search.toLowerCase();
    if (!workorder.feature_name.toLowerCase().includes(query)) return false;
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    if (!filters.status.includes(workorder.status)) return false;
  }

  // Project filter
  if (filters.project && filters.project.length > 0) {
    if (!filters.project.includes(workorder.project_id)) return false;
  }

  return true;
});

// Render cards
{filteredWorkorders.map(workorder => (
  <WorkorderCard
    key={workorder.id}
    workorder={workorder}
    onClick={() => onWorkorderClick?.(workorder.id)}
  />
))}
```

### StubList Component

**Props:**
```typescript
interface StubListProps {
  stubs: StubObject[];
  isLoading: boolean;
  error?: string | null;
  filters?: FilterConfig;
  onStubClick?: (feature_name: string) => void;
}
```

**Rendering Logic:**
```typescript
// Apply filters (client-side)
const filteredStubs = stubs.filter(stub => {
  // Search filter (OR across fields)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    const matchesSearch =
      stub.title.toLowerCase().includes(query) ||
      (stub.description && stub.description.toLowerCase().includes(query));
    if (!matchesSearch) return false;
  }

  // Status filter (IN array)
  if (filters.status && filters.status.length > 0) {
    if (!filters.status.includes(stub.status)) return false;
  }

  // Priority filter (IN array)
  if (filters.priority && filters.priority.length > 0) {
    if (!filters.priority.includes(stub.priority)) return false;
  }

  // Category filter (IN array)
  if (filters.category && filters.category.length > 0) {
    if (!filters.category.includes(stub.category)) return false;
  }

  return true;
});

// Render cards
{filteredStubs.map(stub => (
  <StubCard
    key={stub.id}
    stub={stub}
    onClick={() => onStubClick?.(stub.feature_name)}
  />
))}
```

---

## 9. Performance Considerations

### Tested Thresholds
- **Not yet tested** with > 50 workorders across projects
- **Not yet tested** with > 100 stubs

### Known Bottlenecks
1. **File System Scanning:** API scans all project directories on every request (no caching)
2. **Client-Side Filtering:** Runs on every render when filters change
3. **No Virtualization:** All cards render simultaneously
4. **Parallel Fetches:** Workorders and stubs fetch in parallel on page mount (may strain I/O)
5. **No Pagination:** API returns all data in single response

### Optimization Opportunities

| Opportunity | Impact | Complexity | Priority |
|-------------|--------|------------|----------|
| API-side caching | High | Low | HIGH |
| Memoized filtering | Medium | Low | MEDIUM |
| Virtualized scrolling | High | Medium | DEFERRED |
| API pagination | Medium | High | DEFERRED |
| Debounced search | Low | Low | LOW |

**Immediate Actions:**
1. **API Caching:** Add in-memory cache with 30-second TTL to avoid re-scanning file system
2. **Memoize Filters:** Use `useMemo` for filtered arrays in List components

**Deferred Optimizations:**
- **Virtualization:** Wait until > 100 items reported by users
- **Pagination:** Prioritizing simplicity over performance for now

### Performance Characteristics

**Cold Start (No Cache):**
```
API Request → File System Scan (5 projects × 10 workorders)
├─ Read projects.config.json: ~5ms
├─ Scan 5 projects: ~50ms (10ms per project)
├─ Parse 50 JSON files: ~100ms (2ms per file)
└─ Aggregate response: ~5ms
Total: ~160ms
```

**Warm Start (With Cache):**
```
API Request → Cache Hit
└─ Return cached data: ~5ms
```

---

## 10. Accessibility

### Current Gaps

| Issue | Severity | Component | Fix Required |
|-------|----------|-----------|--------------|
| Loading state not announced | HIGH | WorkorderList, StubList | Add `aria-live="polite"` region with "Loading..." text |
| Error state not announced | HIGH | WorkorderList, StubList | Add `role="alert"` to error messages |
| Empty state clarity | MEDIUM | WorkorderList, StubList | Improve messaging, add icon |
| Refresh button missing aria-label | MEDIUM | Assistant page | Add descriptive aria-label |
| Card focus indicators | LOW | WorkorderCard, StubCard | Verify focus rings visible |

### Required Tasks

1. **HIGH:** Add screen reader announcements for loading/error states
2. **HIGH:** Ensure keyboard navigation works through card lists
3. **MEDIUM:** Add aria-labels to all interactive elements
4. **LOW:** Audit color contrast for status/priority badges

---

## 11. Testing Strategy

### Must-Cover Scenarios

1. **Multi-Project Aggregation:**
   - API correctly merges workorders from 3+ projects
   - `by_project` counts match actual workorder counts
   - Project filter works correctly

2. **Filter Combinations:**
   - Search + status + project filters all work together (AND logic)
   - Filtering returns zero matches shows correct empty state
   - Clearing filters restores full dataset

3. **Loading States:**
   - Skeleton loaders display during fetch
   - Loading state clears on success
   - Loading state clears on error

4. **Error Handling:**
   - API failure shows error message
   - Retry button triggers refetch
   - Error clears on successful retry

5. **Refresh Flow:**
   - Window event triggers hook refetch
   - Manual `refetch()` call works
   - Data updates in UI after refresh

6. **Empty States:**
   - Zero workorders shows "No workorders found"
   - Zero stubs shows "No stubs found"
   - Missing project directory handled gracefully

### Explicitly Not Tested

- **Concurrent filter changes:** User expected to apply filters sequentially
- **Invalid filter values:** No validation - assumes parent provides correct types
- **API schema drift:** No runtime validation of response structure
- **File system watch:** No automatic updates when files change on disk
- **Partial project scan failures:** If one project fails, entire API returns error

---

## 12. Non-Goals / Out of Scope

- **Real-Time File Watching:** No automatic refresh when file system changes
- **Inline Editing:** Cannot modify workorders/stubs from UI
- **Database Layer:** Will never add persistent storage for API responses
- **Server-Side Filtering:** All filtering remains client-side
- **GraphQL API:** REST endpoints will remain the interface
- **WebSocket Updates:** No push-based data sync
- **Offline Mode:** Requires API availability (no IndexedDB caching)
- **Multi-User Collaboration:** Single-user local file system access only
- **Conflict Resolution:** No handling of concurrent file edits
- **Transaction Support:** No atomic multi-file operations

---

## 13. Common Pitfalls & Sharp Edges

### Known Issues

1. **No Cache Invalidation:** Hooks refetch on every mount - may cause stale data if files change during session
2. **File Permission Errors:** API silently skips projects it cannot read (no user notification)
3. **Large Dataset Performance:** No pagination - loading 500+ workorders will freeze UI
4. **Date Parsing Failures:** Invalid ISO 8601 dates cause "Invalid Date" display (not gracefully handled)

### Integration Gotchas

1. **Window Event Scope:** `refetch-workorders` and `refetch-stubs` are global - any component can dispatch
2. **Hook Lifecycle:** Hooks fetch on mount - switching tabs doesn't refetch stale data
3. **Filter State Location:** List components don't own filter state - parent must provide
4. **Missing Fields:** Optional fields like `target_project` may be undefined - components must handle
5. **API Response Timing:** Workorders and stubs fetch in parallel - no guaranteed order

### Configuration Mistakes

1. **Invalid Project Paths:** API skips invalid paths silently - check console for warnings
2. **Missing workorder_dir:** API assumes `coderef/workorder` if not specified
3. **Absolute vs Relative Paths:** Project paths must be absolute, workorder_dir must be relative
4. **Empty Stubs Directory:** Returns empty array (not error) - UI shows "No stubs found"

### Edge Cases

- **Duplicate Workorder IDs:** Not validated - may cause React key warnings
- **Malformed JSON:** API crashes if file is not valid JSON (no try-catch)
- **Circular Dependencies:** If plan.json references external files, not followed
- **Unicode in Filenames:** May cause issues on Windows file systems
- **Long Feature Names:** Card layout may overflow on narrow screens

---

## 14. Breaking Change Handling

### If API Schema Changes

**Required Updates:**
1. Update `types/workorders.ts` or `types/stubs.ts` type definitions
2. Update hook parsing logic to handle new/removed fields
3. Update card components to display new fields
4. Update list filtering logic if new filterable fields added
5. Update resource sheet documentation

**Migration Path:**
```typescript
// Example: Adding "tags" field to workorders
// 1. Update type
interface WorkorderObject {
  // ... existing fields
  tags?: string[];  // NEW FIELD
}

// 2. Update API to include field
// GET /api/workorders returns tags array

// 3. Update hook (no changes needed - passes through)

// 4. Update WorkorderCard to display tags
<div className="flex gap-2">
  {workorder.tags?.map(tag => (
    <span key={tag} className="badge">{tag}</span>
  ))}
</div>

// 5. Update filtering if needed
if (filters.tags && filters.tags.length > 0) {
  if (!workorder.tags?.some(tag => filters.tags.includes(tag))) return false;
}
```

---

## Conclusion

The Data Flow Architecture defines the complete lifecycle for collecting development resources from file system to UI rendering in CodeRef Dashboard. It establishes a **read-only, event-driven, multi-project aggregation system** with no database dependencies, relying on Next.js API routes for file scanning, custom React hooks for state management, and a UnifiedCard-based component hierarchy for visualization.

**Key Architectural Decisions:**
- **File System as Source of Truth:** No database layer, no caching, always fresh
- **Client-Side Filtering:** API returns unfiltered data for simplicity
- **Window Events for Refresh:** Decoupled refresh mechanism across components
- **No Runtime Validation:** Trust TypeScript types and API contracts
- **Multi-Project Aggregation:** Single API call merges all projects

**Maintenance Expectations:**
- Monitor performance when workorder/stub counts exceed 50
- Add API-side caching with TTL (30 seconds recommended)
- Implement accessibility fixes (screen reader announcements)
- Consider virtualization if users report > 100 items
- Update resource sheet when API schemas evolve

**Refactor Safety:**
- Hooks are isolated - can replace fetch implementation without breaking components
- API contracts are stable - adding fields won't break existing components
- Filtering logic is self-contained - can extract to custom hook
- UnifiedCard base ensures consistent rendering across card types
- No hidden global state or side effects

**Integration Contracts:**
This architecture integrates with:
- **Workorders System** (see workorders-system.md)
- **Stubs System** (see stubs-system.md)
- **Assistant Page** (see assistant-page.md)
- **UnifiedCard Component** (base card UI)
- **FilterBar Component** (filter state management)
