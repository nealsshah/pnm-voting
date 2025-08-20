// NEW FILE
// Utility helpers for application-wide settings stored in the "settings" table.
// The table is expected to have the shape:
//   key   TEXT PRIMARY KEY
//   value JSONB or TEXT (here we treat it as boolean for the stats_published flag)
// If the row for a setting does not exist, the getter will return a default value (false).

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'

// Internal: choose the right Supabase instance depending on execution context
const getSupabaseClient = () => (typeof window !== 'undefined' ? createClientComponentClient() : serverSupabase)

const SETTING_KEY = 'stats_published'
const DNI_SETTING_KEY = 'dni_stats_published'
const CURRENT_CYCLE_KEY = 'current_cycle_id'

/**
 * Fetch whether candidate voting statistics are globally published.
 * Returns a boolean – default `false` if the row is missing.
 */
export async function getStatsPublished() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .single()

  if (error && error.message && !error.message.includes('No rows found')) {
    console.error('Error fetching stats_published setting:', error)
    throw error
  }
  if (error && !error.message) {
    // treat as missing row
    return false
  }

  // If row missing or value cannot be parsed, default to false
  if (!data) return false

  try {
    // value might come back as boolean or string – normalise
    if (typeof data.value === 'boolean') return data.value
    if (typeof data.value === 'string') return data.value === 'true'
    return false
  } catch (e) {
    console.error('Error parsing stats_published setting:', e)
    return false
  }
}

/**
 * Update the stats_published flag.
 * @param {boolean} publish – true to publish, false to unpublish
 */
export async function setStatsPublished(publish) {
  const supabase = getSupabaseClient()
  // Upsert so the row is inserted if missing
  const { error } = await supabase
    .from('settings')
    .upsert({ key: SETTING_KEY, value: publish }, { onConflict: 'key' })

  if (error) {
    console.error('Error updating stats_published setting:', error)
    throw error
  }

  // Optionally broadcast the change so clients can react in real-time
  try {
    const channel = supabase.channel('settings-channel')
    await channel.send({
      type: 'broadcast',
      event: 'STATS_PUBLISH_TOGGLE',
      payload: { published: publish }
    })
  } catch (e) {
    // Not fatal – just log it
    console.warn('Warning: unable to broadcast stats_published change', e)
  }

  return true
}

// --------------------- DID-NOT-INTERACT RESULTS ---------------------
export async function getDniStatsPublished() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', DNI_SETTING_KEY)
    .single()

  if (!data) return false
  if (error && error.message && !error.message.includes('No rows found')) {
    console.error('Error fetching dni_stats_published setting:', error)
    // Don't throw, just default to false
    return false
  }
  try {
    if (typeof data.value === 'boolean') return data.value
    if (typeof data.value === 'string') return data.value === 'true'
    return false
  } catch (e) {
    console.error('Error parsing dni_stats_published setting:', e)
    return false
  }
}

export async function setDniStatsPublished(publish) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: DNI_SETTING_KEY, value: publish }, { onConflict: 'key' })

  if (error) {
    console.error('Error updating dni_stats_published setting:', error)
    throw error
  }

  try {
    const channel = supabase.channel('settings-channel')
    await channel.send({
      type: 'broadcast',
      event: 'DNI_STATS_PUBLISH_TOGGLE',
      payload: { published: publish },
    })
  } catch (e) {
    console.warn('Unable to broadcast dni_stats publish change', e)
  }

  return true
}

// --------------------------- RECRUITMENT CYCLES ---------------------------
export async function getCurrentCycleId() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', CURRENT_CYCLE_KEY)
    .single()

  if (error && !error.message?.includes('No rows found')) {
    console.error('Error fetching current_cycle_id setting:', error)
    throw error
  }

  const id = data?.value?.id || null
  return id
}

export async function setCurrentCycleId(cycleId) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: CURRENT_CYCLE_KEY, value: { id: cycleId } }, { onConflict: 'key' })

  if (error) {
    console.error('Error updating current_cycle_id:', error)
    throw error
  }
  return true
}

export async function listRecruitmentCycles() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recruitment_cycles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createRecruitmentCycle({ name, season = null, year = null, status = 'planned', started_at = null }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recruitment_cycles')
    .insert({ name, season, year, status, started_at })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function activateRecruitmentCycle(cycleId) {
  const supabase = getSupabaseClient()
  // Set target to active, and update current_cycle_id setting
  const { error } = await supabase
    .from('recruitment_cycles')
    .update({ status: 'active', started_at: new Date().toISOString(), ended_at: null })
    .eq('id', cycleId)

  if (error) throw error
  await setCurrentCycleId(cycleId)
  return true
}

export async function archiveRecruitmentCycle(cycleId) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('recruitment_cycles')
    .update({ status: 'archived', ended_at: new Date().toISOString() })
    .eq('id', cycleId)

  if (error) throw error
  return true
}

export async function updateRecruitmentCycle(cycleId, updates) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recruitment_cycles')
    .update(updates)
    .eq('id', cycleId)
    .select()
    .single()

  if (error) throw error
  return data
}