# Delibs Seal Functionality

## Overview

The Delibs Seal functionality allows administrators to "seal" a candidate's voting round, which:

1. **Keeps results visible** - The voting results remain displayed to all users
2. **Disables voting** - No new votes can be cast for the sealed candidate
3. **Maintains transparency** - Users can still see the final results but cannot modify them

## Database Schema

A new column `sealed_pnm_id` has been added to the `rounds` table:

```sql
ALTER TABLE rounds ADD COLUMN sealed_pnm_id UUID REFERENCES pnms(id);
```

## API Endpoints

### PATCH /api/delibs/control

Updated to support sealing:

```json
{
  "roundId": "uuid",
  "sealedPnmId": "uuid" // or null to unseal
}
```

## Admin Interface

### Delibs Control Panel

The admin interface includes:

1. **Seal Status Badge** - Shows current seal status
2. **Seal/Unseal Button** - Toggle seal status for the current candidate
3. **Visual Indicators** - Clear indication of sealed state

### Button States

- **Seal Round** - When candidate is not sealed
- **Unseal Round** - When candidate is sealed (destructive variant)

## User Interface

### Candidate View

When a candidate is sealed:

1. **Voting buttons are disabled** - Users cannot cast new votes
2. **Seal indicator displayed** - Clear amber banner showing "Voting Closed - Results Finalized"
3. **Results remain visible** - All existing vote counts and percentages are still shown

### Visual Design

- **Amber color scheme** - Distinct from red (closed) and green (open)
- **Lock icon** - Clear visual indicator of sealed state
- **Dark mode compatible** - Proper contrast in both light and dark themes

## Implementation Status

⚠️ **Database Migration Required**

The seal functionality is implemented but requires the database migration to be applied:

```sql
-- Run this migration to enable seal functionality
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS sealed_pnm_id UUID REFERENCES pnms(id);
CREATE INDEX IF NOT EXISTS rounds_sealed_pnm_idx ON rounds (sealed_pnm_id);
```

### Current State

- ✅ Admin UI implemented
- ✅ API endpoints updated
- ✅ User interface implemented
- ✅ Dark mode compatibility
- ⚠️ Database migration pending
- ⚠️ Seal checks temporarily disabled

### To Enable

1. Apply the database migration
2. Uncomment the seal checks in `CandidateView.jsx`
3. Uncomment the seal UI in `app/admin/delibs/page.jsx`

## Usage

1. **Admin seals a candidate** - Results remain visible, voting disabled
2. **Users see sealed state** - Clear indication that voting is closed
3. **Results preserved** - All vote counts and percentages remain visible
4. **Admin can unseal** - If needed, admin can unseal to re-enable voting

## Benefits

- **Prevents vote manipulation** - No new votes after sealing
- **Maintains transparency** - Results remain visible to all
- **Clear user feedback** - Users understand why voting is disabled
- **Admin control** - Administrators have full control over seal status 