import { getGoogleSheetsData } from '@/lib/google-sheets'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    // Delete all rows in the table using admin client to bypass RLS
    const { error: deleteError } = await supabaseAdmin
      .from('pnm_candidates')
      .delete()
      .not('id', 'is', null)

    if (deleteError) {
      console.error('Error deleting records:', deleteError)
      throw deleteError
    }

    console.log('All rows deleted successfully')

    // Get data from Google Sheets
    const pnmData = await getGoogleSheetsData()

    // Insert new data from Google Sheets using admin client
    const { error: insertError } = await supabaseAdmin
      .from('pnm_candidates')
      .insert(pnmData)

    if (insertError) throw insertError

    return Response.json({ success: true, message: 'PNM data refreshed successfully' })
  } catch (error) {
    console.error('Error refreshing PNM data:', error)
    return Response.json(
      { success: false, message: 'Failed to refresh PNM data' },
      { status: 500 }
    )
  }
}
