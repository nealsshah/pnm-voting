# Recruitment Schedule & Automatic Round Management

This document describes the implementation of the automatic event scheduling and round management system.

## Key Business Rules

- Each social event ("Meet the Brothers", "Speed Networking", etc.) creates a voting round with the same name.
- A round opens exactly at its event's start time and closes at the next event's start time.
- Votes are limited to one per brother × PNM × round, and may be edited while a round is open.
- Events are scheduled over approximately 2 weeks but dates are arbitrary and never overlap.
- Admins can add, edit, delete, and reorder future events in an interactive UI; past events are locked.
- The platform automatically manages rounds (pending → open → closed) without requiring manual intervention.
- Admins have manual override capabilities in case of emergencies.

## Database Schema

The system relies on two primary tables:

1. `events` - Stores information about recruitment events
2. `rounds` - Tracks the voting rounds associated with each event

### Generated Column for Position

The `events` table uses a generated column called `position` that automatically calculates the event's chronological position based on its `starts_at` timestamp.

### Auto-Create Rounds

When a new event is created, a database trigger automatically creates a corresponding round with status "pending".

### Status Transitions

Rounds have three possible statuses:
- `pending` - Not yet open for voting
- `open` - Currently accepting votes
- `closed` - Voting has ended

## Automatic Round Management

The system automatically manages round status transitions through an Edge Function that runs every minute.

### Edge Function: `advanceRounds`

The Edge Function uses two helper SQL functions:
- `open_due_rounds()` - Opens any pending rounds whose events have started
- `close_previous_rounds()` - Closes any open rounds when a newer event has started

When a round's status changes, the function broadcasts a message to the "rounds" channel, allowing clients to refresh their state.

## Real-time Updates

The system uses Supabase Realtime to notify clients of round status changes:

```js
supabase
  .channel('rounds')
  .on('broadcast', { event: 'status-change' }, () => {
    // Refresh the current round data
    fetchCurrentRound();
    // Invalidate any cached queries
    queryClient.invalidateQueries('currentRound');
  })
  .subscribe()
```

## Running Locally

To set up and run the system locally:

1. Apply migrations to create or update the database schema:
   ```bash
   supabase migration up
   ```

2. Generate TypeScript types:
   ```bash
   supabase gen types typescript --project-id $PROJECT_ID > lib/db.types.ts
   ```

3. Serve the Edge Functions locally:
   ```bash
   supabase functions serve --import advanceRounds
   ```

4. Run the Next.js development server:
   ```bash
   npm run dev
   ```

## Admin Interface

Administrators can manage the recruitment schedule at:
- `/admin/schedule` - Add, edit, reorder, and delete events
- `/admin/rounds` - View round status and perform manual overrides

## Manual Override

In case of emergency or special circumstances, admins can:
1. Force-open a pending round (automatically closes any currently open round)
2. Force-close an open round

These operations are performed from the `/admin/rounds` interface. 