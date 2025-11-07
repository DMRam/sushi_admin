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

                if (error || !data) {
                    setIsClient(false)
                    setClientProfile(null)
                } else {
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

    return { isClient, clientProfile, loading }
}