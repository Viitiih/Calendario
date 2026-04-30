# Security Specification

## Data Invariants
1. A configuration for `User` must strictly match the `User` schema.
2. A `User` can only modify their own profile. Profile reads are protected to users in shared calendars.
3. A `Calendar` can be read and written by any authenticated user who has the ID (sharing by URL concept), but the payload must be strictly validated.
4. `WorkDays` must belong to a strictly validated `Calendar`.
5. Only verified users can interact with the data (`request.auth.token.email_verified == true`).

## "Dirty Dozen" Payloads
1. Create User as Guest (Missing Auth) - Fails
2. Create User Profile with spoofed UID - Fails 
3. Add ghost field `isAdmin` to User - Fails
4. Update User email without being Owner - Fails
5. Update WorkDay with 1MB ID string - Fails
6. Insert Expense with invalid `value` (string) - Fails
7. Create Calendar with null ID - Fails
8. Append array element that pushes size > max in calendar users - Fails
9. Fetch WorkDays list without Auth - Fails
10. Update terminal status field - N/A (no terminal states defined)
11. Update system field (`createdAt` override on update) - Fails
12. Blanket List Users without querying for specific UID - Fails
