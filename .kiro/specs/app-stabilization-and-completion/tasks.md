# Implementation Plan: LifeFast App Stabilization and Completion

## Overview

This implementation plan breaks down all 37 requirements into 10 major phases with specific, measurable tasks. Each task is organized with acceptance criteria, references to design approaches, and complexity estimates. Tasks can be executed sequentially or in parallel where dependencies allow.

---

## Phase 1: Zero Build Errors and Console Cleanup

- [-] 1.1 Configure TypeScript strict mode and fix all type errors
  - Enable `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true` in tsconfig.json
  - Run `tsc --noEmit` and fix all reported errors
  - Run `eslint src/**/*.{ts,tsx}` and fix all linting issues
  - Verify `npm run build` completes with zero errors and zero warnings
  - _Requirements: 1.1, 1.2_
  - _Complexity: High_

- [ ]* 1.2 Write property test for build completeness
  - **Property 1: Build Completeness**
  - **Validates: Requirements 1.1, 1.2**

- [~] 1.3 Remove all console.log statements from production code
  - Search for all `console.log()` calls in src/ directory
  - Remove or replace with proper error handling
  - Keep console statements only in development-only files
  - Verify zero matches for `console.log` in production code
  - _Requirements: 1.3_
  - _Complexity: Medium_

- [~] 1.4 Remove all console.error statements and replace with error handling
  - Search for all `console.error()` calls in src/ directory
  - Replace with centralized error logging service
  - Implement error boundaries for React errors
  - Verify zero matches for `console.error` in production code
  - _Requirements: 1.4, 1.5_
  - _Complexity: Medium_

- [ ]* 1.5 Write property test for console cleanup
  - **Property 2: Console Cleanup**
  - **Validates: Requirements 1.3, 1.4**

- [~] 1.6 Checkpoint - Verify zero build errors
  - Run `npm run build` and confirm zero errors and warnings
  - Run `tsc --noEmit` and confirm zero errors
  - Run `eslint src/**/*.{ts,tsx}` and confirm zero errors
  - Ask the user if questions arise.

---

## Phase 2: Console Error Detection Across 12 Screens

- [~] 2.1 Create console error tracking document
  - Create `CONSOLE_ERRORS.md` file in project root
  - Document structure: Screen name, Error type, Error message, Reproduction steps
  - _Requirements: 2.3_
  - _Complexity: Low_

- [~] 2.2 Load and test Dashboard screen for console errors
  - Load Dashboard in development mode
  - Open browser DevTools console
  - Document any errors or warnings
  - Categorize by type (React, Firebase, Network, etc.)
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.3 Load and test Tasks screen for console errors
  - Load Tasks screen in development mode
  - Document any console errors or warnings
  - Categorize errors and add to tracking document
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.4 Load and test Habits screen for console errors
  - Load Habits screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.5 Load and test Budget screen for console errors
  - Load Budget screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.6 Load and test Notes screen for console errors
  - Load Notes screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.7 Load and test Calendar screen for console errors
  - Load Calendar screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.8 Load and test Shopping screen for console errors
  - Load Shopping screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.9 Load and test MealPlanner screen for console errors
  - Load MealPlanner screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.10 Load and test MoodTracker screen for console errors
  - Load MoodTracker screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.11 Load and test DailyPlan screen for console errors
  - Load DailyPlan screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.12 Load and test Goals screen for console errors
  - Load Goals screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.13 Load and test FocusTimer screen for console errors
  - Load FocusTimer screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.14 Load and test AIChat screen for console errors
  - Load AIChat screen in development mode
  - Document any console errors or warnings
  - _Requirements: 2.1, 2.2_
  - _Complexity: Medium_

- [~] 2.15 Test navigation between all screens for errors
  - Navigate from each screen to every other screen
  - Document any navigation errors
  - Verify no console errors during transitions
  - _Requirements: 2.4_
  - _Complexity: Medium_

- [~] 2.16 Fix all identified console errors
  - Review CONSOLE_ERRORS.md document
  - Fix errors at source (component, service, config)
  - Add error boundaries for React errors
  - Implement retry logic for network errors
  - _Requirements: 2.1, 2.2, 2.4_
  - _Complexity: High_

- [ ]* 2.17 Write property test for screen load stability
  - **Property 3: Screen Load Stability**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 2.18 Write property test for navigation stability
  - **Property 4: Navigation Stability**
  - **Validates: Requirements 2.4**

- [~] 2.19 Checkpoint - Verify all screens load without console errors
  - Load each of 12 screens and verify clean console
  - Test navigation between screens
  - Ask the user if questions arise.


---

## Phase 3: Firebase Backend Stability (Rules, Indexes, CRUD)

- [~] 3.1 Deploy Firestore security rules
  - Review security rules in design document
  - Implement user isolation rules (users can only access own data)
  - Implement partner access rules (partners can access shared collections)
  - Implement read/write restrictions by operation type
  - Deploy rules: `firebase deploy --only firestore:rules`
  - Verify rules deployed successfully
  - _Requirements: 3.1_
  - _Complexity: High_

- [~] 3.2 Deploy Firestore indexes for query optimization
  - Create indexes for: Tasks (userId + dueDate), Habits (userId + frequency)
  - Create indexes for: Budget (userId + date), Shopping (userId + completed)
  - Create indexes for: Meals (userId + date), Moods (userId + timestamp)
  - Create indexes for: DailyPlan (userId + time), Messages (userId + timestamp)
  - Deploy indexes: `firebase deploy --only firestore:indexes`
  - Verify all indexes deployed successfully
  - _Requirements: 3.2_
  - _Complexity: Medium_

- [~] 3.3 Implement Task CRUD operations with Firestore persistence
  - Create createTask() function to save tasks to Firestore
  - Create readTask() function to fetch tasks from Firestore
  - Create updateTask() function to update tasks in Firestore
  - Create deleteTask() function to remove tasks from Firestore
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.3_
  - _Complexity: Medium_

- [ ]* 3.4 Write property test for Task CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Tasks)**
  - **Validates: Requirements 3.3**

- [~] 3.5 Implement Habit CRUD operations with Firestore persistence
  - Create createHabit(), readHabit(), updateHabit(), deleteHabit() functions
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.4_
  - _Complexity: Medium_

- [ ]* 3.6 Write property test for Habit CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Habits)**
  - **Validates: Requirements 3.4**

- [~] 3.7 Implement Budget CRUD operations with Firestore persistence
  - Create createBudgetEntry(), readBudgetEntry(), updateBudgetEntry(), deleteBudgetEntry() functions
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.5_
  - _Complexity: Medium_

- [ ]* 3.8 Write property test for Budget CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Budget)**
  - **Validates: Requirements 3.5**

- [~] 3.9 Implement Note CRUD operations with Firestore persistence
  - Create createNote(), readNote(), updateNote(), deleteNote() functions
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.6_
  - _Complexity: Medium_

- [ ]* 3.10 Write property test for Note CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Notes)**
  - **Validates: Requirements 3.6**

- [~] 3.11 Implement Goal CRUD operations with Firestore persistence
  - Create createGoal(), readGoal(), updateGoal(), deleteGoal() functions
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.7_
  - _Complexity: Medium_

- [ ]* 3.12 Write property test for Goal CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Goals)**
  - **Validates: Requirements 3.7**

- [~] 3.13 Implement Shopping CRUD operations with Firestore persistence
  - Create createShoppingItem(), readShoppingItem(), updateShoppingItem(), deleteShoppingItem() functions
  - Include addedBy field to track who added each item
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.8_
  - _Complexity: Medium_

- [ ]* 3.14 Write property test for Shopping CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Shopping)**
  - **Validates: Requirements 3.8**

- [~] 3.15 Implement Calendar CRUD operations with Firestore persistence
  - Create createEvent(), readEvent(), updateEvent(), deleteEvent() functions
  - Verify all operations persist correctly to Firestore
  - _Requirements: 3.9_
  - _Complexity: Medium_

- [ ]* 3.16 Write property test for Calendar CRUD round trip
  - **Property 5: CRUD Persistence Round Trip (Calendar)**
  - **Validates: Requirements 3.9**

- [~] 3.17 Checkpoint - Verify all CRUD operations work correctly
  - Test create, read, update, delete for each entity type
  - Verify data persists in Firestore
  - Ask the user if questions arise.


---

## Phase 4: Dashboard Real Data Display

- [~] 4.1 Implement Today widget to display tasks due today
  - Create useDashboardTasks() hook to fetch tasks due today from Firestore
  - Filter tasks where dueDate is between start of today and start of tomorrow
  - Display task count and list of tasks in widget
  - Subscribe to real-time updates using onSnapshot()
  - _Requirements: 4.1_
  - _Complexity: Medium_

- [~] 4.2 Implement Habit Streak widget
  - Create useHabitStreak() hook to fetch habits from Firestore
  - Calculate habits completed today vs total habits
  - Display completion percentage and visual indicator
  - Subscribe to real-time updates
  - _Requirements: 4.2_
  - _Complexity: Medium_

- [~] 4.3 Implement Monthly Budget widget
  - Create useBudgetWidget() hook to fetch budget entries for current month
  - Calculate total spent and remaining budget
  - Display progress bar showing spending vs limit
  - Subscribe to real-time updates
  - _Requirements: 4.3_
  - _Complexity: Medium_

- [~] 4.4 Implement Next Event widget
  - Create useNextEvent() hook to fetch upcoming calendar events
  - Sort by start time and get the next event
  - Display event title, time, and description
  - Subscribe to real-time updates
  - _Requirements: 4.4_
  - _Complexity: Medium_

- [~] 4.5 Remove all hardcoded placeholder data from Dashboard
  - Search Dashboard component for hardcoded data
  - Replace with real data from Firestore hooks
  - Verify no placeholder values remain
  - _Requirements: 4.5_
  - _Complexity: Low_

- [ ]* 4.6 Write property test for dashboard real data display
  - **Property 6: Dashboard Real Data Display**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 4.7 Write property test for real-time dashboard updates
  - **Property 7: Real-time Dashboard Updates**
  - **Validates: Requirements 4.6**

- [~] 4.8 Checkpoint - Verify Dashboard displays real data
  - Create test data in Firestore
  - Load Dashboard and verify widgets show real data
  - Modify data in Firestore and verify Dashboard updates within 2 seconds
  - Ask the user if questions arise.


---

## Phase 5: Loading States and Empty States UX

- [~] 5.1 Implement SkeletonUI loader for list components
  - Use existing SkeletonUI.tsx component
  - Create useIsLoading() hook to track loading state
  - Display skeleton loader while data is fetching from Firestore
  - _Requirements: 5.1, 5.2_
  - _Complexity: Low_

- [ ]* 5.2 Write property test for loading state display
  - **Property 8: Loading State Display**
  - **Validates: Requirements 5.1, 5.2**

- [~] 5.3 Implement loading state replacement timing
  - Ensure skeleton loader is replaced with content within 100ms of data arrival
  - Add transition animation for smooth replacement
  - Test timing with network throttling
  - _Requirements: 5.3_
  - _Complexity: Medium_

- [ ]* 5.4 Write property test for loading state replacement timing
  - **Property 9: Loading State Replacement Timing**
  - **Validates: Requirements 5.3**

- [~] 5.5 Implement EmptyState component
  - Create EmptyState component with icon, title, description, and action button
  - Accept props: icon, title, description, actionLabel, onAction
  - Style consistently with app theme
  - _Requirements: 6.1, 6.2, 6.3_
  - _Complexity: Medium_

- [~] 5.6 Implement empty state for Tasks list
  - Display EmptyState when tasks list is empty
  - Show "No tasks yet" with icon and "Add first task" button
  - Wire button to open task creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.7 Implement empty state for Habits list
  - Display EmptyState when habits list is empty
  - Show "No habits yet" with icon and "Add first habit" button
  - Wire button to open habit creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.8 Implement empty state for Budget list
  - Display EmptyState when budget entries list is empty
  - Show "No budget entries yet" with icon and "Add first entry" button
  - Wire button to open budget entry creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.9 Implement empty state for Notes list
  - Display EmptyState when notes list is empty
  - Show "No notes yet" with icon and "Add first note" button
  - Wire button to open note creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.10 Implement empty state for Calendar events
  - Display EmptyState when calendar is empty
  - Show "No events yet" with icon and "Add first event" button
  - Wire button to open event creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.11 Implement empty state for Shopping list
  - Display EmptyState when shopping list is empty
  - Show "No items yet" with icon and "Add first item" button
  - Wire button to open shopping item creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.12 Implement empty state for Meals
  - Display EmptyState when meals list is empty
  - Show "No meals yet" with icon and "Add first meal" button
  - Wire button to open meal creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.13 Implement empty state for Moods
  - Display EmptyState when mood history is empty
  - Show "No mood entries yet" with icon and "Record first mood" button
  - Wire button to open mood recording form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.14 Implement empty state for DailyPlan
  - Display EmptyState when daily plan is empty
  - Show "No plan entries yet" with icon and "Add first entry" button
  - Wire button to open plan entry creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.15 Implement empty state for Goals
  - Display EmptyState when goals list is empty
  - Show "No goals yet" with icon and "Add first goal" button
  - Wire button to open goal creation form
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [~] 5.16 Implement empty state for Chat history
  - Display EmptyState when chat history is empty
  - Show "No messages yet" with icon and "Start a conversation" button
  - Wire button to focus message input
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Complexity: Low_

- [ ]* 5.17 Write property test for empty state display
  - **Property 10: Empty State Display**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [~] 5.18 Checkpoint - Verify loading and empty states work
  - Test loading state on each list component
  - Test empty state on each list component
  - Verify transitions are smooth
  - Ask the user if questions arise.


---

## Phase 6: Action Confirmation Feedback and Save Operation Feedback

- [~] 6.1 Implement useSmartNotifications hook for toast notifications
  - Create hook that manages toast notification state
  - Support notification types: success, error, warning, info
  - Auto-dismiss after 3 seconds
  - Allow manual dismiss
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - _Complexity: Medium_

- [~] 6.2 Implement toast notification for task creation
  - Show success toast when task is created
  - Display message: "Task created successfully"
  - Auto-dismiss after 3 seconds
  - _Requirements: 7.1_
  - _Complexity: Low_

- [~] 6.3 Implement toast notification for task update
  - Show success toast when task is updated
  - Display message: "Task updated successfully"
  - Auto-dismiss after 3 seconds
  - _Requirements: 7.2_
  - _Complexity: Low_

- [~] 6.4 Implement toast notification for task deletion
  - Show success toast when task is deleted
  - Display message: "Task deleted successfully"
  - Auto-dismiss after 3 seconds
  - _Requirements: 7.3_
  - _Complexity: Low_

- [~] 6.5 Implement toast notifications for all other entity types
  - Add toast notifications for: Habits, Budget, Notes, Goals, Shopping, Calendar, Meals, Moods, DailyPlan
  - Each should show appropriate success message
  - Auto-dismiss after 3 seconds
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - _Complexity: Medium_

- [ ]* 6.6 Write property test for action confirmation feedback
  - **Property 11: Action Confirmation Feedback**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [~] 6.7 Implement save operation feedback with button state
  - Create useSaveState() hook to track save operation state
  - Disable submit button while save is in progress
  - Display spinner on submit button during save
  - Re-enable button within 100ms of completion
  - _Requirements: 8.1, 8.2, 8.3_
  - _Complexity: Medium_

- [~] 6.8 Apply save operation feedback to all CRUD forms
  - Update Task creation/update form with save feedback
  - Update Habit creation/update form with save feedback
  - Update Budget creation/update form with save feedback
  - Update Note creation/update form with save feedback
  - Update Goal creation/update form with save feedback
  - Update Shopping creation/update form with save feedback
  - Update Calendar creation/update form with save feedback
  - Update Meal creation/update form with save feedback
  - Update Mood recording form with save feedback
  - Update DailyPlan creation/update form with save feedback
  - _Requirements: 8.1, 8.2, 8.3_
  - _Complexity: Medium_

- [ ]* 6.9 Write property test for save operation feedback
  - **Property 12: Save Operation Feedback**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [~] 6.10 Checkpoint - Verify action feedback works
  - Create an item and verify success toast appears
  - Update an item and verify success toast appears
  - Delete an item and verify success toast appears
  - Verify toasts auto-dismiss after 3 seconds
  - Verify save button shows spinner during save
  - Ask the user if questions arise.


---

## Phase 7: Partner Sync Functionality

- [~] 7.1 Implement partner invitation flow
  - Create PartnerInvitation component with email input
  - Create sendPartnerInvitation() function to save invitation to Firestore
  - Store invitation with status: 'pending'
  - Send notification to recipient
  - _Requirements: 10.1, 10.2_
  - _Complexity: High_

- [~] 7.2 Implement partner invitation acceptance
  - Create invitation acceptance UI
  - Create acceptPartnerInvitation() function to update invitation status to 'active'
  - Create connection record in partnerConnections collection
  - Notify sender of acceptance
  - _Requirements: 10.2_
  - _Complexity: High_

- [~] 7.3 Implement partner invitation rejection
  - Create invitation rejection UI
  - Create rejectPartnerInvitation() function to update invitation status to 'rejected'
  - Notify sender of rejection
  - _Requirements: 10.3_
  - _Complexity: Medium_

- [~] 7.4 Implement partner disconnection
  - Create disconnect button in Settings
  - Create disconnectPartner() function to remove connection from both accounts
  - Update connection status to 'disconnected'
  - Notify partner of disconnection
  - _Requirements: 10.4_
  - _Complexity: Medium_

- [ ]* 7.5 Write property test for partner connection establishment
  - **Property 14: Partner Connection Establishment**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [~] 7.6 Implement real-time shopping list sync
  - Create useShoppingSync() hook to subscribe to partner's shopping items
  - Display partner's items in shopping list
  - Show "addedBy" field for each item
  - Subscribe to real-time updates using onSnapshot()
  - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - _Complexity: High_

- [~] 7.7 Implement shopping item sync on create
  - When user creates shopping item, save with addedBy field
  - Sync to partner's view within 2 seconds
  - Display who added the item
  - _Requirements: 11.1, 11.4_
  - _Complexity: Medium_

- [~] 7.8 Implement shopping item sync on update
  - When user updates shopping item, sync change to partner within 2 seconds
  - Update addedBy field if changed
  - _Requirements: 11.2, 11.4_
  - _Complexity: Medium_

- [~] 7.9 Implement shopping item sync on delete
  - When user deletes shopping item, sync deletion to partner within 2 seconds
  - Remove item from partner's view
  - _Requirements: 11.3_
  - _Complexity: Medium_

- [~] 7.10 Implement "Couple" badge in header
  - Display "Couple" badge when partner connection is active
  - Show partner's name or initials
  - Display in header next to user profile
  - _Requirements: 11.5_
  - _Complexity: Low_

- [ ]* 7.11 Write property test for shopping list real-time sync
  - **Property 15: Shopping List Real-time Sync**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

- [~] 7.12 Checkpoint - Verify partner sync works
  - Send partner invitation and verify recipient receives it
  - Accept invitation and verify connection is active
  - Add shopping item and verify partner sees it within 2 seconds
  - Update shopping item and verify partner sees update
  - Delete shopping item and verify partner sees deletion
  - Verify "Couple" badge displays in header
  - Ask the user if questions arise.


---

## Phase 8: PWA Capabilities (Manifest, Service Worker, Offline Queue, Install Prompt)

- [~] 8.1 Create PWA manifest.json file
  - Create public/manifest.json with app metadata
  - Include name: "LifeFast - Productivity App"
  - Include short_name: "LifeFast"
  - Include description: "Your personal productivity companion"
  - Set display: "standalone"
  - Set theme_color: "#6366f1"
  - Set background_color: "#ffffff"
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Complexity: Low_

- [~] 8.2 Add PWA icons to manifest
  - Create 192x192px icon and add to manifest
  - Create 512x512px icon and add to manifest
  - Create maskable 192x192px icon for adaptive icons
  - Create maskable 512x512px icon for adaptive icons
  - Verify icons are properly referenced in manifest
  - _Requirements: 12.1, 12.2_
  - _Complexity: Low_

- [ ]* 8.3 Write property test for PWA manifest configuration
  - **Property 16: PWA Manifest Configuration**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [~] 8.4 Implement Service Worker with cache-first strategy
  - Create public/service-worker.js
  - Implement install event to cache critical assets
  - Cache: index.html, manifest.json, CSS, JS bundles
  - _Requirements: 13.1, 13.2, 13.3_
  - _Complexity: High_

- [~] 8.5 Implement Service Worker fetch event handling
  - Implement cache-first strategy for static assets
  - Implement network-first strategy for API calls
  - Serve cached content when offline
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Complexity: High_

- [~] 8.6 Implement Service Worker activation and cleanup
  - Implement activate event to clean up old caches
  - Remove outdated cache versions
  - Verify new cache is used on next load
  - _Requirements: 13.4_
  - _Complexity: Medium_

- [ ]* 8.7 Write property test for service worker offline caching
  - **Property 17: Service Worker Offline Caching**
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

- [~] 8.8 Implement offline queue storage with IndexedDB
  - Create useOfflineQueue() hook
  - Store queued operations in IndexedDB
  - Support create, update, delete operations
  - Include retry counter and timestamp
  - _Requirements: 14.1, 14.2, 14.3_
  - _Complexity: High_

- [~] 8.9 Implement offline queue sync on reconnection
  - Create syncOfflineQueue() function
  - Execute queued operations when network is restored
  - Retry failed operations up to 3 times
  - Remove successfully synced operations from queue
  - _Requirements: 14.4, 14.5_
  - _Complexity: High_

- [~] 8.10 Implement offline banner display
  - Create OfflineBanner component
  - Display when isOffline state is true
  - Show "No connection" message
  - Position at top of screen
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Complexity: Low_

- [~] 8.11 Implement offline banner hide on reconnection
  - Hide banner within 2 seconds of reconnection
  - Add smooth fade-out animation
  - Verify banner is hidden when online
  - _Requirements: 9.3_
  - _Complexity: Low_

- [ ]* 8.12 Write property test for offline queue operation storage
  - **Property 18: Offline Queue Operation Storage**
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

- [~] 8.13 Implement PWA install prompt
  - Listen for beforeinstallprompt event
  - Store deferred prompt for later use
  - Display custom install prompt after 30 seconds
  - _Requirements: 15.1, 15.2_
  - _Complexity: Medium_

- [~] 8.14 Implement install prompt dismissal logic
  - Store dismissal timestamp in localStorage
  - Don't show prompt again for 7 days if dismissed
  - Allow user to manually trigger install from Settings
  - _Requirements: 15.3, 15.4_
  - _Complexity: Medium_

- [ ]* 8.15 Write property test for PWA install prompt timing
  - **Property 19: PWA Install Prompt Timing**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

- [ ] 8.16 Checkpoint - Verify PWA functionality
  - Verify manifest.json is valid and accessible
  - Test offline functionality by disabling network
  - Verify app loads and displays interface offline
  - Verify offline banner displays when offline
  - Verify offline banner hides when online
  - Test install prompt on mobile device
  - Ask the user if questions arise.


---

## Phase 9: AI Chat Integration

- [ ] 9.1 Implement context data gathering for AI
  - Create gatherContext() function to collect user data
  - Fetch task count from Firestore
  - Fetch completed tasks for today
  - Fetch budget data and calculate remaining
  - Fetch habit completion rate
  - Fetch mood trend for last 7 days
  - Calculate current streak
  - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - _Complexity: High_

- [ ]* 9.2 Write property test for AI context data availability
  - **Property 20: AI Context Data Availability**
  - **Validates: Requirements 17.1, 17.2, 17.3, 17.4**

- [ ] 9.3 Implement Gemini API integration
  - Create generateAIResponse() function
  - Call Gemini API with user message and context
  - Handle API response and extract text
  - Implement error handling for API failures
  - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - _Complexity: High_

- [ ] 9.4 Implement AI error handling
  - Handle expired API key error
  - Handle rate limit error (429)
  - Handle authentication error (401)
  - Handle network timeout error
  - Display user-friendly error messages
  - Don't expose technical details to users
  - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - _Complexity: Medium_

- [ ]* 9.5 Write property test for AI error message display
  - **Property 21: AI Error Message Display**
  - **Validates: Requirements 18.1, 18.2, 18.3, 18.4**

- [ ] 9.6 Implement chat message persistence
  - Create saveChatMessage() function to save messages to Firestore
  - Save user messages with role: 'user'
  - Save AI responses with role: 'assistant'
  - Include timestamp for each message
  - _Requirements: 19.1, 19.2_
  - _Complexity: Medium_

- [ ] 9.7 Implement chat history loading
  - Create loadChatHistory() function to fetch messages from Firestore
  - Load messages for current user
  - Sort messages by timestamp in ascending order
  - Display messages in chronological order
  - _Requirements: 19.3, 19.4_
  - _Complexity: Medium_

- [ ]* 9.8 Write property test for chat history persistence round trip
  - **Property 22: Chat History Persistence Round Trip**
  - **Validates: Requirements 19.1, 19.2, 19.3, 19.4**

- [ ] 9.9 Implement daily suggestion generation
  - Create generateDailySuggestion() function
  - Check if suggestion already exists for today
  - Generate suggestion using gatherContext() and generateAIResponse()
  - Save suggestion to Firestore with date
  - _Requirements: 20.1, 20.2, 20.3, 20.4_
  - _Complexity: High_

- [ ] 9.10 Implement daily suggestion display on Dashboard
  - Create DailySuggestionWidget component
  - Fetch suggestion for today from Firestore
  - Display suggestion with icon and text
  - Show "Suggestion of the day" label
  - _Requirements: 20.1, 20.2, 20.3, 20.4_
  - _Complexity: Medium_

- [ ]* 9.11 Write property test for daily suggestion generation
  - **Property 23: Daily Suggestion Generation**
  - **Validates: Requirements 20.1, 20.2, 20.3, 20.4**

- [ ] 9.12 Checkpoint - Verify AI chat works
  - Send a message in AI Chat and verify response
  - Verify context data is used in response
  - Verify message is saved to Firestore
  - Reload chat and verify message history loads
  - Verify daily suggestion appears on Dashboard
  - Test error handling with invalid API key
  - Ask the user if questions arise.


---

## Phase 10: Final Modules and Production Readiness

- [ ] 10.1 Implement MealPlanner CRUD operations
  - Create createMeal(), readMeal(), updateMeal(), deleteMeal() functions
  - Save meals to Firestore with name, calories, date
  - Implement calorie calculation (sum of all meal calories)
  - Display total calories for the day
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  - _Complexity: Medium_

- [ ]* 10.2 Write property test for MealPlanner CRUD round trip
  - **Property 24: MealPlanner CRUD Round Trip**
  - **Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5**

- [ ] 10.3 Implement MoodTracker recording
  - Create recordMood() function to save mood entries to Firestore
  - Save mood (1-5 scale), note, and timestamp
  - Display mood recording form with scale selector
  - _Requirements: 22.1_
  - _Complexity: Medium_

- [ ] 10.4 Implement MoodTracker history display
  - Create loadMoodHistory() function to fetch last 7 days of moods
  - Display mood entries in reverse chronological order
  - Create mood trend visualization (chart or graph)
  - Show mood patterns over time
  - _Requirements: 22.2, 22.3, 22.4_
  - _Complexity: High_

- [ ]* 10.5 Write property test for MoodTracker history display
  - **Property 25: MoodTracker History Display**
  - **Validates: Requirements 22.1, 22.2, 22.3, 22.4**

- [ ] 10.6 Implement DailyPlan entry management
  - Create addDailyPlanEntry(), updateDailyPlanEntry(), deleteDailyPlanEntry() functions
  - Save entries with title, time (HH:MM format), completed status
  - Sort entries by time in ascending order
  - Re-sort automatically when time is updated
  - _Requirements: 23.1, 23.2, 23.3, 23.4_
  - _Complexity: Medium_

- [ ]* 10.7 Write property test for DailyPlan chronological sorting
  - **Property 26: DailyPlan Chronological Sorting**
  - **Validates: Requirements 23.1, 23.2, 23.3, 23.4**

- [ ] 10.8 Implement Goals progress tracking
  - Create updateGoalProgress() function to save progress to Firestore
  - Implement progress slider (0-100%)
  - Display current progress percentage
  - Allow marking goal as complete (100%)
  - _Requirements: 24.1, 24.2, 24.3, 24.4_
  - _Complexity: Medium_

- [ ]* 10.9 Write property test for Goals progress persistence
  - **Property 27: Goals Progress Persistence**
  - **Validates: Requirements 24.1, 24.2, 24.3, 24.4**

- [ ] 10.10 Implement Focus Timer functionality
  - Create FocusTimer component with countdown display
  - Implement start, pause, reset buttons
  - Count down from set duration (default 25 minutes)
  - Play notification sound when timer reaches zero
  - Continue running when app is in background
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_
  - _Complexity: High_

- [ ]* 10.11 Write property test for Focus Timer countdown
  - **Property 28: Focus Timer Countdown**
  - **Validates: Requirements 25.1, 25.2, 25.3, 25.4, 25.5**

- [ ] 10.12 Implement dark mode color consistency
  - Review all 12 screens for dark mode compatibility
  - Replace light-mode-only classes (e.g., text-gray-800) with theme-aware classes
  - Use theme-aware color system throughout app
  - Ensure text remains readable in both light and dark modes
  - _Requirements: 26.1, 26.2, 26.3, 26.4_
  - _Complexity: High_

- [ ]* 10.13 Write property test for dark mode color application
  - **Property 29: Dark Mode Color Application**
  - **Validates: Requirements 26.1, 26.2, 26.3, 26.4**

- [ ] 10.14 Implement mobile responsive layout (375px)
  - Test all 12 screens at 375px viewport width
  - Ensure no horizontal scrolling
  - Stack elements vertically as needed
  - Ensure buttons and interactive elements are at least 44px tall
  - _Requirements: 27.1, 27.2, 27.3, 27.4_
  - _Complexity: High_

- [ ]* 10.15 Write property test for mobile responsive layout
  - **Property 30: Mobile Responsive Layout**
  - **Validates: Requirements 27.1, 27.2, 27.3, 27.4**

- [ ] 10.16 Implement tablet responsive layout (768px)
  - Test all 12 screens at 768px viewport width
  - Use 2-column layouts where appropriate
  - Display Dashboard widgets in grid layout
  - Optimize use of screen space
  - _Requirements: 28.1, 28.2, 28.3_
  - _Complexity: High_

- [ ]* 10.17 Write property test for tablet responsive layout
  - **Property 31: Tablet Responsive Layout**
  - **Validates: Requirements 28.1, 28.2, 28.3**

- [ ] 10.18 Implement screen transition animations
  - Add smooth animations when navigating between screens
  - Use easing functions for natural motion
  - Complete transitions within 300ms
  - Avoid jarring or abrupt changes
  - _Requirements: 29.1, 29.2, 29.3, 29.4_
  - _Complexity: Medium_

- [ ]* 10.19 Write property test for screen transition animation
  - **Property 32: Screen Transition Animation**
  - **Validates: Requirements 29.1, 29.2, 29.3, 29.4**

- [ ] 10.20 Verify color contrast accessibility
  - Test all text elements for WCAG AA compliance
  - Ensure 4.5:1 contrast ratio for normal text
  - Ensure 3:1 contrast ratio for large text
  - Test in both light and dark modes
  - Use contrast checker tool to verify
  - _Requirements: 30.1, 30.2, 30.3, 30.4_
  - _Complexity: Medium_

- [ ]* 10.21 Write property test for color contrast accessibility
  - **Property 33: Color Contrast Accessibility**
  - **Validates: Requirements 30.1, 30.2, 30.3, 30.4**

- [ ] 10.22 Verify production build quality
  - Run `npm run build` and verify zero warnings
  - Verify JavaScript files are minified
  - Verify asset sizes are optimized
  - Verify source maps are included
  - _Requirements: 31.1, 31.2, 31.3, 31.4_
  - _Complexity: Medium_

- [ ]* 10.23 Write property test for production build quality
  - **Property 34: Production Build Quality**
  - **Validates: Requirements 31.1, 31.2, 31.3, 31.4**

- [ ] 10.24 Deploy to Firebase Hosting
  - Deploy security rules: `firebase deploy --only firestore:rules`
  - Deploy indexes: `firebase deploy --only firestore:indexes`
  - Deploy hosting: `firebase deploy --only hosting`
  - Verify deployment completes without errors
  - Verify app is served over HTTPS
  - Verify caching headers are configured
  - _Requirements: 32.1, 32.2, 32.3, 32.4_
  - _Complexity: Medium_

- [ ]* 10.25 Write property test for Firebase Hosting deployment
  - **Property 35: Firebase Hosting Deployment**
  - **Validates: Requirements 32.1, 32.2, 32.3, 32.4**

- [ ] 10.26 Test new user onboarding flow
  - Create fresh account and complete registration
  - Complete user preferences setup
  - Test all features with new account
  - Verify data persists to Firestore
  - Verify each feature works correctly
  - _Requirements: 33.1, 33.2, 33.3, 33.4_
  - _Complexity: Medium_

- [ ] 10.27 Test cross-platform mobile compatibility
  - Test on iPhone with Safari browser
  - Test on Android with Chrome browser
  - Verify app functions identically on both platforms
  - Verify app displays correctly on both platforms
  - _Requirements: 34.1, 34.2, 34.3, 34.4_
  - _Complexity: Medium_

- [ ] 10.28 Run Lighthouse performance audit
  - Run Lighthouse audit on deployed app
  - Verify Performance score ≥80
  - Verify Accessibility score ≥90
  - Verify PWA score ≥90
  - Address any critical issues identified
  - _Requirements: 35.1, 35.2, 35.3, 35.4_
  - _Complexity: High_

- [ ]* 10.29 Write property test for Lighthouse performance scores
  - **Property 36: Lighthouse Performance Scores**
  - **Validates: Requirements 35.1, 35.2, 35.3, 35.4**

- [ ] 10.30 Configure custom domain (if applicable)
  - Configure custom domain in Firebase Hosting settings
  - Configure DNS records
  - Verify SSL certificate is valid
  - Verify app is accessible at custom domain
  - _Requirements: 36.1, 36.2, 36.3_
  - _Complexity: Low_

- [ ] 10.31 Implement Firebase free tier compliance monitoring
  - Monitor Firestore read/write quota usage
  - Monitor Firebase Hosting bandwidth usage
  - Monitor Firebase Authentication user count
  - Log warnings when approaching quota limits
  - _Requirements: 37.1, 37.2, 37.3, 37.4_
  - _Complexity: Medium_

- [ ]* 10.32 Write property test for Firebase free tier compliance
  - **Property 37: Firebase Free Tier Compliance**
  - **Validates: Requirements 37.1, 37.2, 37.3, 37.4**

- [ ] 10.33 Final checkpoint - Production readiness verification
  - Verify all 37 requirements are implemented
  - Verify all 37 properties pass
  - Verify zero build errors and warnings
  - Verify all 12 screens load without console errors
  - Verify Lighthouse scores meet targets
  - Verify mobile testing completed
  - Verify new user onboarding works
  - Ask the user if questions arise.

