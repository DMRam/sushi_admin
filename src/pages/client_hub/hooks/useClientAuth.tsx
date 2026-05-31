import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import type { ClientProfile } from '../../../types/types'

export function useClientAuth() {
    const { user } = useAuth()
    const [isClient, setIsClient] = useState(false)
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkClientStatus = async () => {
            if (!user) {
                setIsClient(false)
                setClientProfile(null)
                setLoading(false)
                return
            }

            try {
                
                const { data, error } = await supabase
                    .from('client_profiles')
                    .select('*')
                    .eq('firebase_uid', user.uid)
                    .single()

                console.log('🔍 Client profile query result:', { data, error, firebaseUid: user.uid })

                if (error || !data) {
                    console.log('❌ No client profile found or error:', error)
                    setIsClient(false)
                    setClientProfile(null)
                } else if ((data as any).is_blocked || (data as any).deleted_at) {
                    console.log('🚫 Client profile is blocked or archived:', data)
                    setIsClient(false)
                    setClientProfile(null)
                } else {
                    console.log('✅ Client profile found:', data)
                    setIsClient(true)
                    setClientProfile(data as ClientProfile)
                }
            } catch (error) {
                console.error('Error checking client status:', error)
                setIsClient(false)
                setClientProfile(null)
            } finally {
                setLoading(false)
            }
        }

        checkClientStatus()
    }, [user])

    return { isClient, clientProfile, loading, setClientProfile }
}
