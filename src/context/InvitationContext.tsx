import  { createContext, useContext, useEffect, useState } from 'react'
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { useAuth } from './AuthContext'

interface InvitationCode {
    id: string
    code: string
    createdBy: string
    createdAt: Date
    used: boolean
    usedBy?: string
    usedAt?: Date
    maxUses: number
    currentUses: number
}

interface InvitationContextType {
    invitationCodes: InvitationCode[]
    validateCode: (code: string) => Promise<{ isValid: boolean; message: string }>
    markCodeAsUsed: (code: string) => Promise<void>
    createInvitationCode: (maxUses?: number) => Promise<string>
    loading: boolean
}

const InvitationContext = createContext<InvitationContextType | undefined>(undefined)

export function InvitationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([])
    const [loading, setLoading] = useState(true)

    // Get invitation codes collection reference
    const getInvitationCodesRef = () => collection(db, 'invitationCodes')

    // Load invitation codes (admin only)
    useEffect(() => {
        if (!user) {
            setInvitationCodes([])
            setLoading(false)
            return
        }

        // Real-time listener for invitation codes
        const unsubscribe = onSnapshot(getInvitationCodesRef(), (snapshot) => {
            const codes: InvitationCode[] = []
            snapshot.forEach((doc) => {
                const data = doc.data()
                codes.push({
                    id: doc.id,
                    code: data.code,
                    createdBy: data.createdBy,
                    createdAt: data.createdAt?.toDate(),
                    used: data.used,
                    usedBy: data.usedBy,
                    usedAt: data.usedAt?.toDate(),
                    maxUses: data.maxUses || 1,
                    currentUses: data.currentUses || 0
                })
            })
            setInvitationCodes(codes)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    // Validate an invitation code
    const validateCode = async (code: string): Promise<{ isValid: boolean; message: string }> => {
        try {
            const codesQuery = query(
                getInvitationCodesRef(),
                where('code', '==', code.toUpperCase())
            )
            const querySnapshot = await getDocs(codesQuery)

            if (querySnapshot.empty) {
                return { isValid: false, message: 'Invalid invitation code' }
            }

            const codeDoc = querySnapshot.docs[0]
            const codeData = codeDoc.data()

            if (codeData.used && codeData.currentUses >= codeData.maxUses) {
                return { isValid: false, message: 'This invitation code has already been used' }
            }

            if (codeData.maxUses && codeData.currentUses >= codeData.maxUses) {
                return { isValid: false, message: 'This invitation code has reached its maximum uses' }
            }

            return { isValid: true, message: 'Valid invitation code' }
        } catch (error) {
            console.error('Error validating code:', error)
            return { isValid: false, message: 'Error validating invitation code' }
        }
    }

    // Mark a code as used
    // In InvitationContext.tsx - fix the markCodeAsUsed function
    const markCodeAsUsed = async (code: string) => {
        try {
            const codesQuery = query(
                getInvitationCodesRef(),
                where('code', '==', code.toUpperCase())
            )
            const querySnapshot = await getDocs(codesQuery)

            if (!querySnapshot.empty) {
                const codeDoc = querySnapshot.docs[0]
                const codeData = codeDoc.data()
                const currentUses = (codeData.currentUses || 0) + 1
                const used = currentUses >= (codeData.maxUses || 1)

                // Fix: Only include usedBy if user exists and has email
                const updateData: any = {
                    used,
                    usedAt: new Date(),
                    currentUses
                }

                // Only add usedBy if we have a valid user email
                if (user?.email) {
                    updateData.usedBy = user.email
                }

                await updateDoc(codeDoc.ref, updateData)
                console.log('✅ Invitation code marked as used:', code)
            }
        } catch (error) {
            console.error('❌ Error marking code as used:', error)
            throw error
        }
    }

    // Create a new invitation code (admin function)
    // In InvitationContext.tsx - fix the createInvitationCode function
    const createInvitationCode = async (maxUses: number = 1): Promise<string> => {
        if (!user) throw new Error('User must be logged in')

        try {
            // Generate a random 6-character code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase()

            const newCode = {
                code,
                createdBy: user.uid,
                createdAt: new Date(),
                used: false,
                maxUses,
                currentUses: 0
                // Note: Don't include usedBy or usedAt until the code is actually used
            }

            await setDoc(doc(getInvitationCodesRef(), code), newCode)
            console.log('✅ New invitation code created:', code)
            return code
        } catch (error) {
            console.error('Error creating invitation code:', error)
            throw error
        }
    }

    const value = {
        invitationCodes,
        validateCode,
        markCodeAsUsed,
        createInvitationCode,
        loading
    }

    return (
        <InvitationContext.Provider value={value}>
            {children}
        </InvitationContext.Provider>
    )
}

export function useInvitation() {
    const context = useContext(InvitationContext)
    if (context === undefined) {
        throw new Error('useInvitation must be used within an InvitationProvider')
    }
    return context
}