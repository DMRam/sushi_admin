import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
    doc,
    setDoc,
    onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

// Define types
interface AllocationSettings {
    taxRate: number;
    reinvestmentPercentage: number;
    ownerPayPercentage: number;
    emergencyFundPercentage: number;
    monthlyOwnerSalary: number;
    useFixedSalary: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SettingsContextType {
    allocationSettings: AllocationSettings | null;
    saveAllocationSettings: (settings: AllocationSettings) => Promise<boolean>;
    loading: boolean;
}

interface SettingsProviderProps {
    children: ReactNode;
}

// Create context with proper typing
const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: SettingsProviderProps) {
    const [allocationSettings, setAllocationSettings] = useState<AllocationSettings | null>(null)
    const [loading, setLoading] = useState(true)

    // Use a fixed user ID or device ID for anonymous users
    const userId = 'default-user'

    // Reference to allocation settings in Firestore
    const allocationSettingsRef = doc(db, 'users', userId, 'settings', 'profitAllocation')

    // Load allocation settings
    useEffect(() => {
        const unsubscribe = onSnapshot(
            allocationSettingsRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data()
                    setAllocationSettings(data as AllocationSettings)
                } else {
                    // Set default settings if none exist
                    const defaultSettings: AllocationSettings = {
                        taxRate: 14.98,
                        reinvestmentPercentage: 10,
                        ownerPayPercentage: 5,
                        emergencyFundPercentage: 5,
                        monthlyOwnerSalary: 0,
                        useFixedSalary: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                    setAllocationSettings(defaultSettings)
                    // Optionally save defaults to Firebase
                    setDoc(allocationSettingsRef, defaultSettings, { merge: true })
                }
                setLoading(false)
            },
            (error) => {
                console.error('Error loading allocation settings:', error)
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [])

    // Save allocation settings to Firebase
    const saveAllocationSettings = async (settings: AllocationSettings): Promise<boolean> => {
        try {
            const settingsWithTimestamp = {
                ...settings,
                updatedAt: new Date()
            }

            await setDoc(allocationSettingsRef, settingsWithTimestamp, { merge: true })
            return true
        } catch (error) {
            console.error('Error saving allocation settings:', error)
            alert('Error saving settings. Please try again.')
            return false
        }
    }

    const value: SettingsContextType = {
        allocationSettings,
        saveAllocationSettings,
        loading
    }

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings(): SettingsContextType {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}