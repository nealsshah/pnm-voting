import { getGoogleSheetsData } from '@/lib/google-sheets'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Get data from Google Sheets
    const pnmData = await getGoogleSheetsData()
    
    // Upsert data to Supabase
    const { data, error } = await supabase
      .from('pnm_candidates')
      .upsert(pnmData, {
        onConflict: 'email', // when we see duplicate values, update don't replace.
        ignoreDuplicates: false
      })

    if (error) throw error

    return Response.json({ success: true, message: 'PNM data refreshed successfully' })
  } catch (error) {
    console.error('Error refreshing PNM data:', error)
    return Response.json(
      { success: false, message: 'Failed to refresh PNM data' },
      { status: 500 }
    )
  }
}