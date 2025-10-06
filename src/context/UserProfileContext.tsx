// context/UserProfileContext.tsx - Updated with roles
import  { createContext, useContext, useEffect, useState } from 'react'
import { isSuperAdmin } from '../utils/authUtils'
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { useAuth } from './AuthContext'
import { SUPER_ADMINS } from '../config/superAdmins'

// Define user roles
export const UserRole = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    VIEWER: 'viewer'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export interface UserProfile {
    uid: string
    email: string
    displayName: string
    role: UserRole
    createdAt: Date
    updatedAt: Date
    isActive: boolean
}

interface UserProfileContextType {
    userProfile: UserProfile | null
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>
    updateUserRole: (userId: string, role: UserRole) => Promise<void>
    loading: boolean
    hasPermission: (requiredRole: UserRole) => boolean
    canAccess: (allowedRoles: UserRole[]) => boolean
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

// Role hierarchy - higher roles have more permissions
const roleHierarchy = {
    [UserRole.VIEWER]: 0,
    [UserRole.STAFF]: 1,
    [UserRole.MANAGER]: 2,
    [UserRole.ADMIN]: 3
}


// Helper function to create initial invitation codes
const createInitialInvitationCodes = async (adminUid: string) => {
    try {
        const invitationCodesRef = collection(db, 'invitationCodes')

        // Create a manager code
        await setDoc(doc(invitationCodesRef, 'MANAGER001'), {
            code: 'MANAGER001',
            createdBy: adminUid,
            createdAt: new Date(),
            used: false,
            maxUses: 5,
            currentUses: 0
        })

        // Create a staff code
        await setDoc(doc(invitationCodesRef, 'STAFF001'), {
            code: 'STAFF001',
            createdBy: adminUid,
            createdAt: new Date(),
            used: false,
            maxUses: 10,
            currentUses: 0
        })

        console.log('Initial invitation codes created')
    } catch (error) {
        console.error('Error creating initial invitation codes:', error)
    }
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    console.log('🔄 UserProfileProvider: User changed', {
        user: user?.email,
        hasUserProfile: !!userProfile,
        loading
    })

    const getUserDocRef = (userId: string) => doc(db, 'users', userId)

    // Check if user has required role permission
    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!userProfile) return false
        return roleHierarchy[userProfile.role] >= roleHierarchy[requiredRole]
    }

    // Check if user can access based on allowed roles
    const canAccess = (allowedRoles: UserRole[]): boolean => {
        if (!userProfile) return false
        return allowedRoles.includes(userProfile.role)
    }

    useEffect(() => {
        if (!user) {
            setUserProfile(null)
            setLoading(false)
            return
        }

        // In UserProfileContext.tsx - update the initializeUserProfile function
        // In UserProfileContext.tsx - update the initializeUserProfile function
        const initializeUserProfile = async () => {
            try {
                console.log('🔄 UserProfile: Starting initialization for user:', user?.email)
                const userDocRef = getUserDocRef(user.uid)
                const userDoc = await getDoc(userDocRef)

                if (userDoc.exists()) {
                    let profileData = userDoc.data() as UserProfile

                    // Check if profile is missing the role field
                    if (!profileData.role) {
                        console.log('🔧 UserProfile: Existing profile missing role field, fixing...')

                        // Determine the correct role
                        const userIsSuperAdmin = isSuperAdmin(user.email)
                        const correctRole = userIsSuperAdmin ? UserRole.ADMIN : UserRole.VIEWER

                        // Update the profile with the missing role
                        profileData = {
                            ...profileData,
                            role: correctRole,
                            updatedAt: new Date()
                        }

                        // Save the fixed profile back to Firestore
                        await updateDoc(userDocRef, {
                            role: correctRole,
                            updatedAt: new Date()
                        })

                        console.log('✅ UserProfile: Fixed missing role, set to:', correctRole)
                    }

                    console.log('✅ UserProfile: Existing profile found:', profileData)
                    setUserProfile(profileData)
                } else {
                    console.log('🆕 UserProfile: No existing profile, creating new one')

                    // Check if user is a super admin
                    const userIsSuperAdmin = isSuperAdmin(user.email)
                    console.log('🔐 UserProfile: Super admin check:', {
                        email: user.email,
                        isSuperAdmin: userIsSuperAdmin,
                        superAdmins: SUPER_ADMINS
                    })

                    // Create new user profile
                    const newUserProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email || '',
                        displayName: user.displayName || user.email?.split('@')[0] || 'User',
                        role: userIsSuperAdmin ? UserRole.ADMIN : UserRole.VIEWER,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isActive: true
                    }

                    console.log('📝 UserProfile: Creating new profile:', newUserProfile)
                    await setDoc(userDocRef, newUserProfile)
                    setUserProfile(newUserProfile)

                    if (userIsSuperAdmin) {
                        console.log('🎯 UserProfile: Super admin detected, profile created as admin')
                    } else {
                        console.log('👤 UserProfile: Regular user, profile created as viewer')
                    }
                }
            } catch (error) {
                console.error('❌ UserProfile: Error initializing profile:', error)
            } finally {
                console.log('🏁 UserProfile: Initialization complete - loading set to false')
                setLoading(false)
            }
        }

        initializeUserProfile()

        // Real-time listener for profile updates
        if (user) {
            const unsubscribe = onSnapshot(getUserDocRef(user.uid), (doc) => {
                if (doc.exists()) {
                    setUserProfile(doc.data() as UserProfile)
                }
            })

            return () => unsubscribe()
        }
    }, [user])

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) throw new Error('No user logged in')

        try {
            const userDocRef = getUserDocRef(user.uid)
            const updateData = {
                ...updates,
                updatedAt: new Date()
            }

            await updateDoc(userDocRef, updateData)
        } catch (error) {
            console.error('Error updating profile:', error)
            throw error
        }
    }

    const updateUserRole = async (userId: string, role: UserRole) => {
        if (!user) throw new Error('No user logged in')

        // Only admins can change roles
        if (userProfile?.role !== UserRole.ADMIN) {
            throw new Error('Insufficient permissions to change roles')
        }

        try {
            const userDocRef = getUserDocRef(userId)
            await updateDoc(userDocRef, {
                role,
                updatedAt: new Date()
            })
        } catch (error) {
            console.error('Error updating user role:', error)
            throw error
        }
    }

    const value = {
        userProfile,
        updateProfile,
        updateUserRole,
        loading,
        hasPermission,
        canAccess
    }

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    )
}

export function useUserProfile() {
    const context = useContext(UserProfileContext)
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProfileProvider')
    }
    return context
}