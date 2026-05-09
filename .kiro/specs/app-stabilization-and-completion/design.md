# Design Document: LifeFast App Stabilization and Completion

## Overview

The LifeFast productivity app is a React + TypeScript + Firebase PWA with 12 main screens. This design document outlines the technical approach to achieve production-ready quality through:

1. **Build Stability**: Zero TypeScript errors, removed debug logging, clean production builds
2. **Runtime Stability**: Console error detection and resolution across all 12 screens
3. **Data Reliability**: Firebase backend with security rules, indexes, and CRUD operations
4. **User Experience**: Real data display, loading states, empty states, action feedback
5. **Offline Capability**: Service Worker caching, offline queue, PWA installation
6. **AI Integration**: Context-aware Gemini chat with history persistence
7. **Feature Completion**: MealPlanner, MoodTracker, DailyPlan, Goals, Focus Timer
8. **Accessibility & Performance**: Dark mode, responsive design, Lighthouse compliance
9. **Deployment**: Firebase Hosting with custom domain support

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LifeFast PWA (React + TS)                │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (12 Screens)                                      │
│  ├─ Dashboard, Tasks, Habits, Budget, Notes, Calendar      │
│  ├─ Shopping, MealPlanner, MoodTracker, DailyPlan          │
│  ├─ Goals, Focus Timer, AI Chat                            │
│  └─ Settings, Partner Sync                                 │
├─────────────────────────────────────────────────────────────┤
│  State Management & Hooks                                   │
│  ├─ useAuth (Firebase Auth)                                │
│  ├─ useFirestore (Real-time data sync)                     │
│  ├─ useOfflineQueue (Offline operations)                   │
│  ├─ useTheme (Dark/Light mode)                             │
│  └─ useSmartNotifications (Toast feedback)                 │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ├─ Firebase Auth Service                                  │
│  ├─ Firestore CRUD Service                                 │
│  ├─ AI Chat Service (Gemini API)                           │
│  ├─ Partner Sync Service                                   │
│  └─ Offline Queue Service                                  │
├─────────────────────────────────────────────────────────────┤
│  Service Worker & PWA                                       │
│  ├─ Cache-first strategy for assets                        │
│  ├─ Network-first for API calls                            │
│  ├─ Offline queue persistence                              │
│  └─ Install prompt management                              │
├─────────────────────────────────────────────────────────────┤
│  Firebase Backend                                           │
│  ├─ Authentication (Email/Password, Google)                │
│  ├─ Firestore (Real-time database)                         │
│  ├─ Security Rules (User isolation, Partner access)        │
│  ├─ Indexes (Query optimization)                           │
│  └─ Hosting (HTTPS, caching, custom domain)                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Real-time Data Sync Flow:**
1. User action triggers state update
2. Optimistic UI update (immediate feedback)
3. Firestore write operation queued
4. If online: write to Firebase immediately
5. If offline: store in offline queue (IndexedDB)
6. On reconnection: sync queued operations
7. Real-time listener updates UI with server state

**AI Chat Flow:**
1. User sends message
2. Message saved to Firestore
3. Context data fetched (tasks, budget, habits)
4. Gemini API called with context
5. Response saved to Firestore
6. UI updated with response
7. Chat history persisted for future sessions

## Components and Interfaces

### Core Component Structure

```
App
├─ AuthLayout (Login/Register)
├─ MainLayout
│  ├─ Header (with Couple badge, offline indicator)
│  ├─ Navigation (Bottom nav or sidebar)
│  ├─ MainContent
│  │  ├─ Dashboard
│  │  ├─ Tasks
│  │  ├─ Habits
│  │  ├─ Budget
│  │  ├─ Notes
│  │  ├─ Calendar
│  │  ├─ Shopping
│  │  ├─ MealPlanner
│  │  ├─ MoodTracker
│  │  ├─ DailyPlan
│  │  ├─ Goals
│  │  ├─ FocusTimer
│  │  ├─ AIChat
│  │  └─ Settings
│  ├─ NotificationCenter (Toast notifications)
│  ├─ OfflineBanner (when isOffline = true)
│  └─ InstallPrompt (PWA install)
└─ ServiceWorker (background)
```

### Key Interfaces

**User Data Model:**
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  theme: 'light' | 'dark';
  partnerId?: string;
  createdAt: Timestamp;
}

interface PartnerConnection {
  userId: string;
  partnerId: string;
  status: 'pending' | 'active' | 'rejected';
  createdAt: Timestamp;
}
```

**Shared Data Models:**
```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  completed: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ShoppingItem {
  id: string;
  userId: string;
  partnerId?: string;
  title: string;
  quantity: number;
  completed: boolean;
  addedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  completedDates: Timestamp[];
  createdAt: Timestamp;
}

interface BudgetEntry {
  id: string;
  userId: string;
  category: string;
  amount: number;
  date: Timestamp;
  createdAt: Timestamp;
}

interface Meal {
  id: string;
  userId: string;
  name: string;
  calories: number;
  date: Timestamp;
  createdAt: Timestamp;
}

interface MoodEntry {
  id: string;
  userId: string;
  mood: 1 | 2 | 3 | 4 | 5;
  note: string;
  timestamp: Timestamp;
}

interface DailyPlanEntry {
  id: string;
  userId: string;
  title: string;
  time: string; // HH:MM format
  completed: boolean;
  createdAt: Timestamp;
}

interface Goal {
  id: string;
  userId: string;
  title: string;
  progress: number; // 0-100
  targetDate: Timestamp;
  createdAt: Timestamp;
}

interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

interface DailySuggestion {
  id: string;
  userId: string;
  suggestion: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
}
```

**Offline Queue Model:**
```typescript
interface QueuedOperation {
  id: string;
  userId: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}
```

## Data Models

### Firestore Collection Structure

```
users/
  {userId}/
    - uid: string
    - email: string
    - displayName: string
    - theme: 'light' | 'dark'
    - partnerId: string (optional)
    - createdAt: Timestamp

partnerConnections/
  {connectionId}/
    - userId: string
    - partnerId: string
    - status: 'pending' | 'active' | 'rejected'
    - createdAt: Timestamp

tasks/
  {userId}/
    {taskId}/
      - title: string
      - description: string
      - dueDate: Timestamp
      - completed: boolean
      - createdAt: Timestamp
      - updatedAt: Timestamp

habits/
  {userId}/
    {habitId}/
      - name: string
      - frequency: 'daily' | 'weekly'
      - completedDates: Timestamp[]
      - createdAt: Timestamp

budget/
  {userId}/
    {entryId}/
      - category: string
      - amount: number
      - date: Timestamp
      - createdAt: Timestamp

notes/
  {userId}/
    {noteId}/
      - title: string
      - content: string
      - createdAt: Timestamp
      - updatedAt: Timestamp

calendar/
  {userId}/
    {eventId}/
      - title: string
      - startTime: Timestamp
      - endTime: Timestamp
      - description: string
      - createdAt: Timestamp

shopping/
  {userId}/
    {itemId}/
      - title: string
      - quantity: number
      - completed: boolean
      - addedBy: string (userId)
      - createdAt: Timestamp
      - updatedAt: Timestamp

meals/
  {userId}/
    {mealId}/
      - name: string
      - calories: number
      - date: Timestamp
      - createdAt: Timestamp

moods/
  {userId}/
    {moodId}/
      - mood: 1-5
      - note: string
      - timestamp: Timestamp

dailyPlan/
  {userId}/
    {entryId}/
      - title: string
      - time: string (HH:MM)
      - completed: boolean
      - createdAt: Timestamp

goals/
  {userId}/
    {goalId}/
      - title: string
      - progress: 0-100
      - targetDate: Timestamp
      - createdAt: Timestamp

messages/
  {userId}/
    {messageId}/
      - role: 'user' | 'assistant'
      - content: string
      - timestamp: Timestamp

dailySuggestions/
  {userId}/
    {suggestionId}/
      - suggestion: string
      - date: string (YYYY-MM-DD)
      - createdAt: Timestamp
```

### Firebase Security Rules Strategy

**Core Principles:**
1. User isolation: Users can only access their own data
2. Partner access: Partners can access shared collections (shopping)
3. Read/Write restrictions: Enforce operation types
4. Timestamp validation: Prevent future-dated entries
5. Data validation: Enforce schema constraints

**Rule Structure:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - read/write own only
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Tasks - read/write own only
    match /tasks/{userId}/{taskId=**} {
      allow read, write: if request.auth.uid == userId;
    }

    // Shopping - read/write own, read partner's
    match /shopping/{userId}/{itemId=**} {
      allow read: if request.auth.uid == userId || 
                     isPartner(request.auth.uid, userId);
      allow write: if request.auth.uid == userId;
    }

    // Messages - read/write own only
    match /messages/{userId}/{messageId=**} {
      allow read, write: if request.auth.uid == userId;
    }

    // Partner connections
    match /partnerConnections/{connectionId} {
      allow read: if request.auth.uid in [
        resource.data.userId,
        resource.data.partnerId
      ];
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.uid == resource.data.partnerId;
    }

    // Helper function
    function isPartner(uid, targetUid) {
      return exists(/databases/$(database)/documents/partnerConnections/
        $(uid)_$(targetUid)) ||
             exists(/databases/$(database)/documents/partnerConnections/
        $(targetUid)_$(uid));
    }
  }
}
```

**Firestore Indexes Required:**
- Tasks: userId + dueDate (for "tasks due today")
- Habits: userId + frequency (for habit queries)
- Budget: userId + date (for monthly summaries)
- Shopping: userId + completed (for active items)
- Meals: userId + date (for daily totals)
- Moods: userId + timestamp (for 7-day history)
- DailyPlan: userId + time (for chronological sorting)
- Messages: userId + timestamp (for chat history)



## Build and Stability Strategy

### Zero Build Errors Approach

**TypeScript Configuration:**
- Enable strict mode in tsconfig.json
- Use `noImplicitAny: true` to catch type errors
- Enable `noUnusedLocals` and `noUnusedParameters`
- Run `npm run build` to verify zero errors

**Console Cleanup:**
- Remove all `console.log()` statements from production code
- Replace `console.error()` with proper error handling
- Use error boundaries to catch React errors
- Implement centralized error logging service

**Build Verification:**
- Run TypeScript compiler: `tsc --noEmit`
- Run ESLint: `eslint src/**/*.{ts,tsx}`
- Verify no warnings in build output
- Test production build locally before deployment

### Console Error Detection

**Error Detection Strategy:**
1. Load each of 12 screens in development
2. Open browser DevTools console
3. Document any errors or warnings
4. Categorize by type (React, Firebase, Network, etc.)
5. Create tracking file: `CONSOLE_ERRORS.md`

**Error Categories to Track:**
- React component errors (missing props, render errors)
- Firebase errors (auth, Firestore, network)
- Network errors (CORS, timeouts, 404s)
- Third-party library errors (Gemini API, etc.)
- TypeScript type errors

**Resolution Process:**
- Fix errors at source (component, service, config)
- Add error boundaries for React errors
- Implement retry logic for network errors
- Add proper error handling for async operations

## PWA Implementation Strategy

### Service Worker Architecture

**Service Worker Lifecycle:**
1. **Installation**: Cache critical assets
2. **Activation**: Clean up old caches
3. **Fetch**: Serve from cache or network

**Caching Strategy:**

```typescript
// Cache-first for static assets
const CACHE_NAME = 'lifefast-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles.css',
  '/app.js'
];

// Network-first for API calls
const API_CACHE = 'lifefast-api-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Network-first for API
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          caches.open(API_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});
```

### Offline Queue Implementation

**Queue Storage (IndexedDB):**
```typescript
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}

// Store operations in IndexedDB when offline
async function queueOperation(op: QueuedOperation) {
  const db = await openDB('lifefast-queue');
  await db.add('operations', op);
}

// Sync when online
async function syncQueue() {
  const db = await openDB('lifefast-queue');
  const operations = await db.getAll('operations');
  
  for (const op of operations) {
    try {
      await executeOperation(op);
      await db.delete('operations', op.id);
    } catch (error) {
      op.retries++;
      if (op.retries < 3) {
        await db.put('operations', op);
      }
    }
  }
}
```

### PWA Manifest Configuration

**manifest.json Structure:**
```json
{
  "name": "LifeFast - Productivity App",
  "short_name": "LifeFast",
  "description": "Your personal productivity companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### Install Prompt Management

**Install Prompt Logic:**
```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const INSTALL_DISMISSED_KEY = 'install-dismissed-until';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show prompt after 30 seconds
  setTimeout(() => {
    const dismissedUntil = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!dismissedUntil || Date.now() > parseInt(dismissedUntil)) {
      showInstallPrompt();
    }
  }, 30000);
});

function showInstallPrompt() {
  // Display custom install prompt UI
  // On dismiss: localStorage.setItem(INSTALL_DISMISSED_KEY, 
  //   (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
}

async function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
}
```

## AI Chat Integration

### Context-Aware Architecture

**Context Data Collection:**
```typescript
interface ChatContext {
  taskCount: number;
  completedTasksToday: number;
  budgetRemaining: number;
  habitCompletionRate: number;
  moodTrend: number[];
  currentStreak: number;
}

async function gatherContext(userId: string): Promise<ChatContext> {
  const today = new Date().toDateString();
  
  const tasks = await getTasksForUser(userId);
  const completedToday = tasks.filter(t => 
    t.completed && new Date(t.updatedAt).toDateString() === today
  ).length;
  
  const budget = await getBudgetForMonth(userId);
  const remaining = budget.limit - budget.spent;
  
  const habits = await getHabitsForUser(userId);
  const completionRate = calculateCompletionRate(habits);
  
  const moods = await getMoodsForLastWeek(userId);
  const moodTrend = moods.map(m => m.mood);
  
  return {
    taskCount: tasks.length,
    completedTasksToday,
    budgetRemaining: remaining,
    habitCompletionRate: completionRate,
    moodTrend,
    currentStreak: calculateStreak(habits)
  };
}
```

### Gemini API Integration

**API Call with Context:**
```typescript
async function generateAIResponse(
  userMessage: string,
  context: ChatContext,
  userId: string
): Promise<string> {
  const systemPrompt = `You are LifeFast, a personal productivity assistant. 
    The user has ${context.taskCount} tasks, 
    completed ${context.completedTasksToday} today,
    has $${context.budgetRemaining} remaining in budget,
    and has a ${context.habitCompletionRate}% habit completion rate.
    Provide personalized, encouraging productivity advice.`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.REACT_APP_GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUser: ${userMessage}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

### Error Handling

**API Error Scenarios:**
```typescript
async function handleAIError(error: any): Promise<string> {
  if (error.message.includes('API key')) {
    return 'AI service is not configured. Please contact support.';
  }
  if (error.message.includes('429')) {
    return 'AI service is busy. Please try again in a moment.';
  }
  if (error.message.includes('401')) {
    return 'AI service authentication failed. Please try again.';
  }
  return 'Unable to generate response. Please try again.';
}
```

### Daily Suggestion Generation

**Scheduled Suggestion:**
```typescript
async function generateDailySuggestion(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if suggestion already exists
  const existing = await getDocWhere('dailySuggestions', 
    'userId', '==', userId,
    'date', '==', today
  );
  
  if (existing.length > 0) return;
  
  const context = await gatherContext(userId);
  const suggestion = await generateAIResponse(
    'Give me one productivity tip for today based on my current situation.',
    context,
    userId
  );
  
  await saveDoc('dailySuggestions', {
    userId,
    suggestion,
    date: today,
    createdAt: new Date()
  });
}

// Call on Dashboard load or via scheduled function
```

## Feature Implementation Strategy

### Dashboard Real Data Display

**Widget Components:**
1. **Today Widget**: Shows tasks due today
2. **Habit Streak Widget**: Shows habits completed today vs total
3. **Budget Widget**: Shows current month balance and progress
4. **Next Event Widget**: Shows upcoming calendar event
5. **Suggestion Widget**: Shows daily AI suggestion

**Real-time Updates:**
```typescript
function useDashboardData(userId: string) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribeTasks = onSnapshot(
      query(collection(db, 'tasks', userId), 
        where('dueDate', '>=', startOfToday()),
        where('dueDate', '<', startOfTomorrow())
      ),
      (snapshot) => {
        setData(prev => ({
          ...prev,
          todayTasks: snapshot.docs.map(doc => doc.data())
        }));
      }
    );
    
    return () => unsubscribeTasks();
  }, [userId]);
}
```

### Loading and Empty States

**Skeleton Loader:**
- Use existing SkeletonUI.tsx component
- Display during data fetch (max 100ms before showing)
- Replace with content when data arrives

**Empty State Pattern:**
```typescript
function ListComponent({ items, isLoading, itemType }) {
  if (isLoading) return <SkeletonLoader />;
  
  if (items.length === 0) {
    return (
      <EmptyState
        icon={getIconForType(itemType)}
        title={`No ${itemType} yet`}
        description={`Create your first ${itemType} to get started`}
        actionLabel={`Add first ${itemType}`}
        onAction={() => openCreateForm(itemType)}
      />
    );
  }
  
  return <ItemList items={items} />;
}
```

### Action Feedback System

**Toast Notification Pattern:**
```typescript
function useActionFeedback() {
  const { showNotification } = useSmartNotifications();
  
  const notifySuccess = (action: string, itemType: string) => {
    showNotification({
      type: 'success',
      message: `${itemType} ${action} successfully`,
      duration: 3000
    });
  };
  
  return { notifySuccess };
}

// Usage in CRUD operations
async function createTask(task: Task) {
  try {
    await addDoc(collection(db, 'tasks', userId), task);
    notifySuccess('created', 'Task');
  } catch (error) {
    notifySuccess('failed', 'Task');
  }
}
```

### Partner Sync Implementation

**Invitation Flow:**
1. User enters partner email
2. Create pending connection in Firestore
3. Send notification to partner
4. Partner accepts/rejects
5. Update connection status
6. Display "Couple" badge in header

**Real-time Shopping Sync:**
- Shopping items have `addedBy` field
- Both users can see and edit shared items
- Changes sync within 2 seconds via Firestore listeners
- Display who added each item

## Responsive Design Strategy

### Mobile (375px)
- Single column layout
- Full-width cards
- Bottom navigation
- Touch-friendly buttons (44px minimum)
- Vertical stacking of widgets

### Tablet (768px)
- 2-column grid layouts
- Dashboard widgets in grid
- Sidebar navigation
- More whitespace
- Optimized for landscape

### Desktop (1024px+)
- 3-column layouts where appropriate
- Sidebar navigation
- Expanded dashboard
- Multi-panel views

### Dark Mode Implementation

**Theme System:**
```typescript
const themes = {
  light: {
    bg: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
    card: 'bg-gray-50'
  },
  dark: {
    bg: 'bg-gray-900',
    text: 'text-gray-100',
    border: 'border-gray-700',
    card: 'bg-gray-800'
  }
};

// Apply theme-aware classes
<div className={`${themes[theme].bg} ${themes[theme].text}`}>
```

**Color Contrast Requirements:**
- Text on background: 4.5:1 ratio (WCAG AA)
- Large text: 3:1 ratio
- Test with contrast checker tool

## Testing and Deployment Strategy

### Build Verification
- `npm run build` completes with zero errors
- `npm run build` completes with zero warnings
- Production build is minified and optimized
- Source maps included for debugging

### Console Error Testing
- Load each 12 screens in development
- Document any console errors/warnings
- Fix all identified issues
- Verify clean console on all screens

### Firebase Deployment
- Deploy security rules: `firebase deploy --only firestore:rules`
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Deploy hosting: `firebase deploy --only hosting`
- Verify HTTPS and caching headers

### Mobile Testing
- Test on iPhone with Safari
- Test on Android with Chrome
- Verify PWA installation works
- Test offline functionality
- Verify responsive layouts

### Lighthouse Audit
- Performance: ≥80
- Accessibility: ≥90
- PWA: ≥90
- Address critical issues

### New User Onboarding
- Test registration flow
- Verify preferences save
- Test all features with fresh account
- Verify data persistence



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Build Completeness

*For any* TypeScript source code in the project, running `npm run build` should complete successfully with zero TypeScript errors and zero warnings in the output.

**Validates: Requirements 1.1, 1.2**

### Property 2: Console Cleanup

*For any* production code file, searching for `console.log`, `console.error`, or `console.warn` statements should return zero matches (excluding test files and development-only code).

**Validates: Requirements 1.3, 1.4**

### Property 3: Screen Load Stability

*For any* of the 12 screens in the application, loading that screen should result in zero console errors and zero console warnings in the browser DevTools console.

**Validates: Requirements 2.1, 2.2**

### Property 4: Navigation Stability

*For any* pair of screens in the application, navigating from one screen to another should complete without producing navigation errors or console errors.

**Validates: Requirements 2.4**

### Property 5: CRUD Persistence Round Trip

*For any* entity type (Task, Habit, Budget, Note, Goal, Shopping, Calendar, Meal, Mood, DailyPlan), creating an entity, reading it back from Firestore, updating it, reading it again, and deleting it should result in the entity being removed from Firestore.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

### Property 6: Dashboard Real Data Display

*For any* user with data in Firestore, the Dashboard widgets should display data from Firestore collections rather than hardcoded placeholder values.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 7: Real-time Dashboard Updates

*For any* change to user data in Firestore, the Dashboard widgets should reflect that change within 2 seconds without requiring a page refresh.

**Validates: Requirements 4.6**

### Property 8: Loading State Display

*For any* list component that is fetching data from Firestore, the component should display a SkeletonUI loader while data is loading.

**Validates: Requirements 5.1, 5.2**

### Property 9: Loading State Replacement Timing

*For any* list component, once data arrives from Firestore, the SkeletonUI loader should be replaced with actual content within 100ms.

**Validates: Requirements 5.3**

### Property 10: Empty State Display

*For any* list component with zero items, the component should display an empty state UI with an icon, descriptive text, and an "Add first X" button.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 11: Action Confirmation Feedback

*For any* CRUD operation (create, update, delete) on any entity, the application should display a toast notification confirming the action, and the notification should disappear automatically after 3 seconds.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 12: Save Operation Feedback

*For any* Firebase save operation in progress, the submit button should be disabled and display a spinner, and should be re-enabled within 100ms of operation completion.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 13: Offline Banner Display

*For any* network disconnection event, the application should display an offline banner at the top of the screen within 2 seconds, and should hide it within 2 seconds of reconnection.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 14: Partner Connection Establishment

*For any* partner invitation flow, sending an invitation, having the partner accept it, should result in both users having an active partner connection in Firestore.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 15: Shopping List Real-time Sync

*For any* shopping item added, updated, or deleted by one partner, the change should be visible to the other partner within 2 seconds, and should display who added the item.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 16: PWA Manifest Configuration

*For any* PWA manifest.json file, it should include 192px and 512px icons, specify theme_color, display mode as standalone, and include app name and short_name.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

### Property 17: Service Worker Offline Caching

*For any* critical app asset (HTML, CSS, JS), the service worker should cache it during installation, and should serve it from cache when the device is offline.

**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 18: Offline Queue Operation Storage

*For any* CRUD operation performed while offline, the operation should be stored in the offline queue (IndexedDB), and should be synced to Firebase when the network is restored.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 19: PWA Install Prompt Timing

*For any* first-time mobile user, after 30 seconds of app usage, an install prompt should be displayed, and should not be shown again for 7 days if dismissed.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4**

### Property 20: AI Context Data Availability

*For any* AI chat message generation, the AI should have access to the user's task count, budget data, and habit completion status to personalize responses.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

### Property 21: AI Error Message Display

*For any* AI API error (expired key, rate limit, network error), the application should display a user-friendly error message without exposing technical details.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4**

### Property 22: Chat History Persistence Round Trip

*For any* chat message sent by a user, the message should be saved to Firestore, and when the user reopens the chat, the message should be loaded from Firestore and displayed in chronological order.

**Validates: Requirements 19.1, 19.2, 19.3, 19.4**

### Property 23: Daily Suggestion Generation

*For any* new day, the Dashboard should display a "Suggestion of the day" widget with an AI-generated suggestion based on user context, and the suggestion should be generated only once per day.

**Validates: Requirements 20.1, 20.2, 20.3, 20.4**

### Property 24: MealPlanner CRUD Round Trip

*For any* meal created in the MealPlanner, the meal should be saved to Firestore, and the total calories should be calculated correctly by summing all meal calories.

**Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5**

### Property 25: MoodTracker History Display

*For any* mood entry recorded, the entry should be saved to Firestore with a timestamp, and the MoodTracker should display mood history for the last 7 days with a visualization.

**Validates: Requirements 22.1, 22.2, 22.3, 22.4**

### Property 26: DailyPlan Chronological Sorting

*For any* daily plan entries, the entries should be sorted by time in ascending order, and when an entry's time is updated, the list should re-sort automatically.

**Validates: Requirements 23.1, 23.2, 23.3, 23.4**

### Property 27: Goals Progress Persistence

*For any* goal progress update via slider, the new progress value should be saved to Firestore, and the Goals screen should display the current progress percentage.

**Validates: Requirements 24.1, 24.2, 24.3, 24.4**

### Property 28: Focus Timer Countdown

*For any* focus timer session, the timer should count down from the set duration, play a notification sound when reaching zero, and continue running when the app is in the background.

**Validates: Requirements 25.1, 25.2, 25.3, 25.4, 25.5**

### Property 29: Dark Mode Color Application

*For any* screen in the application, when dark mode is enabled, all text and background colors should use theme-aware classes and maintain readability without displaying light-mode-only classes.

**Validates: Requirements 26.1, 26.2, 26.3, 26.4**

### Property 30: Mobile Responsive Layout

*For any* screen at 375px viewport width, the screen should display without horizontal scrolling, stack elements vertically as needed, and ensure buttons are at least 44px tall for touch targets.

**Validates: Requirements 27.1, 27.2, 27.3, 27.4**

### Property 31: Tablet Responsive Layout

*For any* screen at 768px viewport width, the screen should use 2-column layouts where appropriate, and the Dashboard should display widgets in a grid layout.

**Validates: Requirements 28.1, 28.2, 28.3**

### Property 32: Screen Transition Animation

*For any* navigation between screens, the transition should animate smoothly, complete within 300ms, and use easing functions without jarring changes.

**Validates: Requirements 29.1, 29.2, 29.3, 29.4**

### Property 33: Color Contrast Accessibility

*For any* text element in the application, the color contrast ratio should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text) in both light and dark modes.

**Validates: Requirements 30.1, 30.2, 30.3, 30.4**

### Property 34: Production Build Quality

*For any* production build, the build should complete with zero warnings, have minified JavaScript files, optimized asset sizes, and include source maps for debugging.

**Validates: Requirements 31.1, 31.2, 31.3, 31.4**

### Property 35: Firebase Hosting Deployment

*For any* deployment to Firebase Hosting, the application should be served over HTTPS, have appropriate caching headers configured, and complete deployment without errors.

**Validates: Requirements 32.1, 32.2, 32.3, 32.4**

### Property 36: Lighthouse Performance Scores

*For any* Lighthouse audit of the deployed application, the Performance score should be ≥80, Accessibility score should be ≥90, and PWA score should be ≥90.

**Validates: Requirements 35.1, 35.2, 35.3, 35.4**

### Property 37: Firebase Free Tier Compliance

*For any* month of operation, the application should monitor Firestore read/write quota, Firebase Hosting bandwidth, and Authentication user count, and log warnings when approaching limits.

**Validates: Requirements 37.1, 37.2, 37.3, 37.4**

## Error Handling Strategy

### Error Categories and Handling

**Firebase Errors:**
- Authentication errors: Display login prompt
- Firestore permission errors: Display "Access denied" message
- Network errors: Queue operation and retry on reconnection
- Quota errors: Display "Service temporarily unavailable" message

**AI Chat Errors:**
- API key expired: Display "AI service not configured"
- Rate limit exceeded: Display "AI service busy, try again later"
- Network timeout: Display "Connection lost, try again"
- Invalid response: Display "Unable to generate response"

**UI Errors:**
- Component render errors: Use error boundary to catch and display fallback UI
- Navigation errors: Log error and redirect to home screen
- Data loading errors: Display error message with retry button

**Offline Errors:**
- Queue sync failures: Retry with exponential backoff (max 3 retries)
- Corrupted queue data: Clear queue and notify user
- Storage quota exceeded: Warn user and clear old operations

### Error Logging

**Centralized Error Logger:**
```typescript
interface ErrorLog {
  timestamp: Timestamp;
  userId: string;
  errorType: string;
  message: string;
  stack?: string;
  context?: any;
}

async function logError(error: Error, context?: any) {
  const errorLog: ErrorLog = {
    timestamp: new Date(),
    userId: getCurrentUserId(),
    errorType: error.name,
    message: error.message,
    stack: error.stack,
    context
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(errorLog);
  }
  
  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    await sendToErrorTracker(errorLog);
  }
}
```

## Testing Strategy

### Unit Testing Approach

**Test Coverage Areas:**
1. **Component Tests**: Verify UI renders correctly with different props
2. **Hook Tests**: Test custom hooks (useAuth, useFirestore, useOfflineQueue)
3. **Service Tests**: Test Firebase, AI, and offline queue services
4. **Utility Tests**: Test helper functions and formatters

**Example Unit Test:**
```typescript
describe('Dashboard', () => {
  it('displays today tasks from Firestore', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', dueDate: today },
      { id: '2', title: 'Task 2', dueDate: today }
    ];
    
    jest.mock('firebase/firestore', () => ({
      query: jest.fn(),
      where: jest.fn(),
      onSnapshot: jest.fn((q, callback) => {
        callback({ docs: mockTasks.map(t => ({ data: () => t })) });
        return jest.fn();
      })
    }));
    
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Task 1')).toBeInTheDocument();
      expect(getByText('Task 2')).toBeInTheDocument();
    });
  });
});
```

### Property-Based Testing Approach

**Property Test Configuration:**
- Use fast-check library for JavaScript/TypeScript
- Minimum 100 iterations per property test
- Tag each test with feature and property reference
- Generate realistic data (valid emails, dates, etc.)

**Example Property Test:**
```typescript
import fc from 'fast-check';

describe('Feature: app-stabilization-and-completion, Property 5: CRUD Persistence Round Trip', () => {
  it('should persist and retrieve tasks correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          description: fc.string(),
          dueDate: fc.date()
        }),
        async (taskData) => {
          // Create
          const docRef = await addDoc(collection(db, 'tasks', userId), taskData);
          
          // Read
          const doc = await getDoc(docRef);
          expect(doc.data()).toEqual(taskData);
          
          // Update
          await updateDoc(docRef, { title: 'Updated' });
          const updated = await getDoc(docRef);
          expect(updated.data().title).toBe('Updated');
          
          // Delete
          await deleteDoc(docRef);
          const deleted = await getDoc(docRef);
          expect(deleted.exists()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Integration Test Areas:**
1. **Authentication Flow**: Register, login, logout
2. **Data Sync**: Create data, verify Firestore persistence, verify UI update
3. **Offline Flow**: Go offline, create data, go online, verify sync
4. **Partner Sync**: Invite partner, share data, verify sync
5. **AI Chat**: Send message, verify context, verify response

### E2E Testing

**E2E Test Scenarios:**
1. **New User Onboarding**: Register → Setup → Create first task → View dashboard
2. **Daily Workflow**: Create task → Complete task → View dashboard → Check AI suggestion
3. **Partner Collaboration**: Invite partner → Add shopping item → Partner sees update
4. **Offline Workflow**: Go offline → Create task → Go online → Verify sync
5. **Mobile Experience**: Install PWA → Use offline → Verify functionality

### Performance Testing

**Lighthouse Audit:**
- Run before deployment
- Target scores: Performance ≥80, Accessibility ≥90, PWA ≥90
- Address critical issues
- Monitor Core Web Vitals

**Load Testing:**
- Test with 100+ concurrent users
- Verify Firestore quota not exceeded
- Monitor response times
- Verify offline queue handles high volume

### Mobile Testing

**Device Testing:**
- iPhone with Safari (iOS 14+)
- Android with Chrome (Android 10+)
- Test all 12 screens
- Test PWA installation
- Test offline functionality
- Test responsive layouts

### Accessibility Testing

**WCAG AA Compliance:**
- Color contrast: 4.5:1 for normal text
- Keyboard navigation: All interactive elements accessible
- Screen reader: All content readable
- Focus indicators: Visible focus states
- Touch targets: 44px minimum

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] Zero TypeScript errors: `npm run build`
- [ ] Zero console errors on all 12 screens
- [ ] All Firebase security rules deployed
- [ ] All Firestore indexes deployed
- [ ] PWA manifest configured
- [ ] Service worker tested offline
- [ ] Lighthouse scores ≥80/90/90
- [ ] Mobile testing completed
- [ ] Accessibility testing completed
- [ ] New user onboarding tested

### Deployment Steps

1. **Build Production Bundle**
   ```bash
   npm run build
   ```

2. **Deploy Firebase Rules and Indexes**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

3. **Deploy to Firebase Hosting**
   ```bash
   firebase deploy --only hosting
   ```

4. **Verify Deployment**
   - Check Firebase Hosting URL
   - Verify HTTPS
   - Test all features
   - Check Lighthouse scores

5. **Configure Custom Domain** (if applicable)
   - Add domain in Firebase Hosting settings
   - Configure DNS records
   - Verify SSL certificate

### Post-Deployment Monitoring

- Monitor Firestore quota usage
- Monitor Firebase Hosting bandwidth
- Monitor error logs
- Monitor Lighthouse scores
- Monitor user feedback
- Monitor performance metrics

