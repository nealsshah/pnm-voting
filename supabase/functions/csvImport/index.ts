import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'
import { parse } from 'https://deno.land/std@0.177.0/csv/parse.ts'

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse the multipart form data to get the file
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Read the file as text
    const csvText = await file.text()

    // Parse the CSV
    // Accept both the new header order and legacy headers; treat as header-based parse
    const parsed = parse(csvText, {
      skipFirstRow: false,
      columns: true
    })

    // Basic validation for required fields
    const validRows = parsed
      .map((row: Record<string, string>) => {
        const email = (row.email || row['vt email'] || row['VT Email'] || '').toString().toLowerCase().trim()
        const first_name = (row.first_name || row['First Name'] || row['first name'] || row['First Name:'] || '').toString().trim()
        const last_name = (row.last_name || row['Last Name'] || row['last name'] || row['Last Name:'] || '').toString().trim()
        const pronouns = (row.pronouns || row['Pronouns'] || row['Pronouns:'] || '').toString().trim()
        const major = (row.major || row['Major(s)'] || row['Majors'] || row['Major'] || '').toString().trim()
        const minor = (row.minor || row['Minor(s)'] || row['Minors'] || row['Minor'] || '').toString().trim()
        const year = (row.year || row['Year'] || '').toString().trim()
        const gpaRaw = (row.gpa || row['GPA'] || '').toString().trim()
        return {
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          pronouns: pronouns || null,
          major: major || null,
          minor: minor || null,
          year: year || null,
          gpa: gpaRaw || null,
        }
      })
      .filter(row => typeof row.email === 'string' && row.email.includes('@'))

    // Look up current cycle id
    const { data: currentCycle } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'current_cycle_id')
      .single()

    const currentCycleId = currentCycle?.value?.id || null

    // Prepare data for upsert
    const pnmRows = validRows.map(row => ({
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      pronouns: row.pronouns,
      major: row.major,
      minor: row.minor,
      year: row.year,
      gpa: row.gpa,
      ...(currentCycleId ? { cycle_id: currentCycleId } : {}),
    }))

    // Perform upsert operation
    const { data, error } = await supabase
      .from('pnms')
      .upsert(pnmRows, {
        onConflict: currentCycleId ? 'email,cycle_id' : 'email',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      throw error
    }

    // Return response with success status and summary
    return new Response(JSON.stringify({
      success: true,
      summary: {
        total: parsed.length,
        valid: validRows.length,
        inserted: data?.length || 0,
        skipped: parsed.length - validRows.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 