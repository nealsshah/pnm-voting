# Delibs Seal Functionality

## Overview

The Delibs Seal functionality allows administrators to "seal" a candidate's voting round, which:

1. **Keeps results visible** - The voting results remain displayed to all users
2. **Disables voting** - No new votes can be cast for the sealed candidate
3. **Maintains transparency** - Users can still see the final results but cannot modify them

## Database Schema

Multiple sealed candidates are supported with JSONB arrays in the `rounds` table:

```sql
ALTER TABLE rounds ADD COLUMN sealed_pnm_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rounds ADD COLUMN sealed_results JSONB DEFAULT '{}'::jsonb;
```

## API Endpoints

### PATCH /api/delibs/control

Updated to support multiple sealing:

```json
{
  "roundId": "uuid",
  "sealedPnmIds": ["uuid1", "uuid2"], // array of sealed candidate IDs
  "sealedResults": {
    "uuid1": { "yes": 5, "no": 2, "total": 7, "timestamp": "2024-01-01T00:00:00Z" },
    "uuid2": { "yes": 3, "no": 4, "total": 7, "timestamp": "2024-01-01T00:00:00Z" }
  }
}
```

## Admin Interface

### Delibs Control Panel

The admin interface includes:

1. **Seal Status Badge** - Shows count of sealed candidates (e.g., "3 Sealed")
2. **Seal/Unseal Button** - Toggle seal status for the current candidate
3. **Result Snapshots** - Shows sealed vote counts in candidate list
4. **Visual Indicators** - Clear indication of sealed state with lock icons

### Button States

- **Seal Round** - When candidate is not sealed
- **Unseal Round** - When candidate is sealed (destructive variant)

## User Interface

### Candidate View

When a candidate is sealed:

1. **Voting buttons are disabled** - Users cannot cast new votes
2. **Seal indicator displayed** - Clear amber banner showing "Voting Closed - Results Finalized"
3. **Results remain visible** - All existing vote counts and percentages are still shown
4. **Sealed result snapshot** - Shows the vote counts when the candidate was sealed

### Visual Design

- **Amber color scheme** - Distinct from red (closed) and green (open)
- **Lock icon** - Clear visual indicator of sealed state
- **Dark mode compatible** - Proper contrast in both light and dark themes

## Implementation Status

⚠️ **Database Migration Required**

The seal functionality is implemented but requires the database migration to be applied:

```sql
-- Run this migration to enable multiple seal functionality
ALTER TABLE rounds DROP COLUMN IF EXISTS sealed_pnm_id;
ALTER TABLE rounds ADD COLUMN sealed_pnm_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rounds ADD COLUMN sealed_results JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS rounds_sealed_pnm_ids_idx ON rounds USING GIN (sealed_pnm_ids);
CREATE INDEX IF NOT EXISTS rounds_sealed_results_idx ON rounds USING GIN (sealed_results);
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