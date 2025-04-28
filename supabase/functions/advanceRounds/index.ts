// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Create a Supabase client with the service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

export const cron = '*/1 * * * *'  // every minute

export default async () => {
  try {
    const now = new Date().toISOString()
    
    // 1. Open next pending event whose start ≤ now
    await supabase.rpc('open_due_rounds', { now })
    
    // 2. Close current round if a later one just opened
    await supabase.rpc('close_previous_rounds', { now })
    
    // 3. Broadcast so clients live-refresh
    // Trigger an update on the rounds table to notify clients of changes
    // This is a workaround since we can't directly use realtime.broadcast
    const dummyId = '00000000-0000-0000-0000-000000000000'
    try {
      await supabase
        .from('rounds')
        .update({ updated_at: now })
        .eq('id', dummyId)
    } catch (error) {
      // Ignore errors - this is just to trigger a table change notification
      console.log('Broadcast trigger attempted')
    }
    
    // Optional: Return success status for logs
    return {
      success: true,
      timestamp: now,
    }
  } catch (error) {
    // Log error
    console.error('Error in advanceRounds:', error)
    
    // Return error status
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
} 