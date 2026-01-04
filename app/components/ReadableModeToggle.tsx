'use client';

import React from 'react';
import { useReadableMode } from './ReadableModeProvider';

export default function ReadableModeToggle() {
    const { isReadable, toggleReadable } = useReadableMode();

    return (
        <button
            onClick={toggleReadable}
            className="fixed bottom-4 right-4 z-50 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all border-2 border-white group"
            aria-label={isReadable ? 'Disable readable mode' : 'Enable readable mode'}
            title={isReadable ? 'Disable readable mode' : 'Enable readable mode'}
        >
            <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                {isReadable ? (
                    // Eye slash (readable mode ON)
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                ) : (
                    // Glasses icon (readable mode OFF)
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                )}
            </svg>
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black text-white text-xs font-serif rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {isReadable ? 'Standard View' : 'Readable Mode'}
            </div>
        </button>
    );
}
