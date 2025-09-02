import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'

export async function POST(request) {
  try {
    // Get formData from request
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return Response.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createRouteHandlerClient(
      { cookies },
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get user session and check if admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse CSV file
    const text = await file.text()
    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    // Determine current cycle id to ensure upsert keys include cycle
    const { data: currentCycle } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'current_cycle_id')
      .single()

    const currentCycleId = currentCycle?.value?.id || null

    // Process each row
    let inserted = 0, skipped = 0
    for (const row of rows) {
      // Support both new headers and legacy headers
      const email = (row.email || row["vt email"] || row["VT Email"] || '').toString().toLowerCase().trim()
      const firstName = (row.first_name || row["First Name"] || row["first name"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"] || row["First Name:"]).toString().trim()
      const lastName = (row.last_name || row["Last Name"] || row["last name"] || row["Last Name:"]).toString().trim()
      const pronouns = (row.pronouns || row["Pronouns"] || row["Pronouns:"] || null)?.toString().trim() || null
      const major = (row.major || row["Major(s)"] || row["Majors"] || row["Major"] || null)?.toString().trim() || null
      const minor = (row.minor || row["Minor(s)"] || row["Minors"] || row["Minor"] || null)?.toString().trim() || null
      const year = (row.year || row["Year"] || null)?.toString().trim() || null
      const gpa = (row.gpa || row["GPA"] || null)?.toString().trim() || null

      if (!email) {
        continue
      }

      const record = {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        major,
        minor,
        pronouns,
        year,
        gpa,
      }
      if (currentCycleId) {
        record.cycle_id = currentCycleId
      }
      // Insert or update PNM record (use composite onConflict if cycle present)
      const { error } = await supabase
        .from('pnms')
        .upsert(
          record,
          { onConflict: currentCycleId ? 'email,cycle_id' : 'email' }
        )

      error ? (skipped++) : (inserted++)
    }

    // Broadcast realtime event for connected clients to refresh
    await supabase.from('pnms').select('id').limit(1)

    return Response.json({ inserted, skipped })
  } catch (error) {
    console.error('Error importing CSV:', error)
    return Response.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
} 