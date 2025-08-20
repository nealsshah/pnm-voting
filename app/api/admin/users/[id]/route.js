import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE /api/admin/users/:id
export async function DELETE(request, { params }) {
    const { id } = params

    if (!id) {
        return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    try {
        // Auth check – must be signed-in admin
        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        const { data: meta } = await supabase
            .from('users_metadata')
            .select('role')
            .eq('id', user.id)
            .single()

        if (meta?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete the auth user (also cascades metadata if FK w/ON DELETE)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (error) {
            console.error('Supabase admin delete error:', error)
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
        }

        // Optionally delete metadata row if not cascade
        await supabase.from('users_metadata').delete().eq('id', id)

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Error in delete user route:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 