import { google } from 'googleapis'
import { supabaseAdmin } from './supabase'

export async function getGoogleSheetsData() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SHEET_ID,
      range: 'Sheet1!A2:Z', // Adjust range as needed
    })

    const rows = response.data.values
    
    // Use supabaseAdmin for database operations
    const { data, error } = await supabaseAdmin
      .from('pnm_candidates')
      .upsert(
        rows.map(row => ({
          first_name: row[0],
          last_name: row[1],
          pronouns: row[2], 
          email: row[3],
          year: row[4],
          major: row[5],
          gpa: row[6],
          info_session: row[7],
          bp: row[8],
          deib: row[9],
          lw: row[10],
          mtb: row[11],
          rr: row[12],
          sn: row[13]
        })),
        { 
          onConflict: 'email',  // Use email as the conflict resolution key
          ignoreDuplicates: false // Update existing records
        }
      )

    if (error) {
      console.error('Error inserting data:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    throw error
  }
}
