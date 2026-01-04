'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ReadableModeContextType {
    isReadable: boolean;
    toggleReadable: () => void;
}

const ReadableModeContext = createContext<ReadableModeContextType>({
    isReadable: false,
    toggleReadable: () => {},
});

export function useReadableMode() {
    return useContext(ReadableModeContext);
}

export function ReadableModeProvider({ children }: { children: React.ReactNode }) {
    const [isReadable, setIsReadable] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Load preference from localStorage on mount
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('readable-mode');
        if (saved === 'true') {
            setIsReadable(true);
        }
    }, []);

    // Apply readable class to body and save to localStorage
    useEffect(() => {
        if (!mounted) return;

        if (isReadable) {
            document.documentElement.classList.add('readable-mode');
            localStorage.setItem('readable-mode', 'true');
        } else {
            document.documentElement.classList.remove('readable-mode');
            localStorage.setItem('readable-mode', 'false');
        }
    }, [isReadable, mounted]);

    const toggleReadable = () => {
        setIsReadable(!isReadable);
    };

    return (
        <ReadableModeContext.Provider value={{ isReadable, toggleReadable }}>
            {children}
        </ReadableModeContext.Provider>
    );
}
