import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
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
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get user session and check if admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', session.user.id)
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
    
    // Process each row
    let inserted = 0, skipped = 0
    for (const row of rows) {
      // Insert or update PNM record
      const { error } = await supabase
        .from('pnms')
        .upsert(
          {
            email: row.email.toLowerCase(),
            first_name: row.first_name,
            last_name: row.last_name,
            major: row.major,
            year: row.year,
            gpa: row.gpa,
          },
          { onConflict: 'email' }
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