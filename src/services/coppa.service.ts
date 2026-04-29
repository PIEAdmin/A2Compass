import { supabase } from './supabase'

export interface ParentalConsent {
  id: string
  parent_id: string
  child_id: string
  consent_type: string
  consent_given: boolean
  consent_method: string
  ip_address: string | null
  consent_text: string
  created_at: string
  revoked_at: string | null
}

export const coppaService = {
  async hasConsent(parentId: string, childId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('parental_consents')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('consent_type', 'coppa_collection')
      .eq('consent_given', true)
      .is('revoked_at', null)
      .limit(1)
    if (error) { console.error('hasConsent error:', error); return false }
    return (data?.length ?? 0) > 0
  },

  async getConsents(parentId: string): Promise<ParentalConsent[]> {
    const { data, error } = await supabase
      .from('parental_consents')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
    if (error) { console.error('getConsents error:', error); return [] }
    return data || []
  },

  async giveConsent(params: {
    parentId: string
    childId: string
    consentMethod?: string
  }): Promise<boolean> {
    const consentText =
      "I am the parent or legal guardian of this child. I consent to the collection and use of my child's personal information by A² Compass (Achievement Academy) for educational purposes, in accordance with the Children's Online Privacy Protection Act (COPPA). I understand I can review, delete, or revoke this consent at any time by contacting hello@a2compass.org."

    const { error } = await supabase
      .from('parental_consents')
      .insert({
        parent_id: params.parentId,
        child_id: params.childId,
        consent_type: 'coppa_collection',
        consent_given: true,
        consent_method: params.consentMethod || 'web_checkbox',
        consent_text: consentText,
      })
    if (error) { console.error('giveConsent error:', error); return false }
    return true
  },

  async revokeConsent(parentId: string, childId: string): Promise<boolean> {
    const { error } = await supabase
      .from('parental_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('consent_type', 'coppa_collection')
      .is('revoked_at', null)
    if (error) { console.error('revokeConsent error:', error); return false }
    return true
  },
}
