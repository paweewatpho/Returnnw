import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (role?: UserRole) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // In a real app, map this to a user profile in DB to get ROLE
                const role: UserRole = 'ADMIN'; // Defaulting to ADMIN for now
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || 'User',
                    role: role,
                    photoURL: firebaseUser.photoURL || undefined
                });
            } else {
                // If not logged in via Firebase, check local mock session?
                // For now, just set null.
                // setUser(null); 
                // Don't auto-logout if we are using manual mock login for testing 
                // unless we want strict Firebase adherence.
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (role: UserRole = 'ADMIN') => {
        // MOCK LOGIN for Development / Transition
        const mockUser: User = {
            uid: 'mock-user-' + Date.now(),
            email: 'admin@neosiam.com',
            displayName: 'Admin User',
            role: role
        };
        setUser(mockUser);
    };

    const logout = async () => {
        await signOut(auth).catch((err) => console.error("Firebase Signout Error", err));
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
