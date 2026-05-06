# Security Specification - LifeFlow Premium

## Data Invariants
1. A task must have a title, completed status, priority, and link to a valid user.
2. Shopping items are shared based on user relationship (partnerUid in userProfiles).
3. Habits track completions as a map of date strings.
4. Notes must not exceed 10,000 characters.
5. All transactions in the budget must have a valid amount and type (income/expense).
6. Plan items are strictly tied to a date and time.
7. User profiles are only modifiable by the owner.
8. Invites are only accessible by the sender or the recipient.

## The "Dirty Dozen" Payloads (Red Team Audit)
1. **Identity Spoofing**: Attempt to create a task with a different user's UID.
2. **Resource Poisoning**: Create a task with a document ID that is 1MB of random characters.
3. **Shadow Update**: Update a task and try to set `isPremium: true` (a non-existent field).
4. **Partner Bypass**: Read another user's tasks when not their partner.
5. **State Shortcut**: Update a note's `createdAt` timestamp manually.
6. **Negative Budget**: Create a transaction with a negative amount (if not explicitly handled, though rules should check types).
7. **Invite Hijack**: Accept an invite sent to someone else.
8. **PII Leak**: Read a user's full profile (including partner details) without being that user.
9. **Spam Invites**: Send an invite from another user's UID.
10. **Note Bloat**: Try to save a note with 10MB of text.
11. **Orphaned Plans**: Create a plan item for a non-existent date format.
12. **System Bypass**: Update a habit's `userId` after creation.
