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
    const parsed = parse(csvText, {
      skipFirstRow: true, // Skip header row
      columns: ['email', 'first_name', 'last_name', 'major', 'year', 'gpa']
    })

    // Basic validation for required fields
    const validRows = parsed.filter(row => {
      return typeof row.email === 'string' && row.email.includes('@')
    })

    // Prepare data for upsert
    const pnmRows = validRows.map(row => ({
      email: row.email?.trim(),
      first_name: row.first_name?.trim() || null,
      last_name: row.last_name?.trim() || null,
      major: row.major?.trim() || null,
      year: row.year?.trim() || null,
      gpa: !isNaN(parseFloat(row.gpa)) ? parseFloat(row.gpa) : null
    }))

    // Perform upsert operation
    const { data, error } = await supabase
      .from('pnms')
      .upsert(pnmRows, {
        onConflict: 'email',
        ignoreDuplicates: false // Update existing records
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