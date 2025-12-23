'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] font-serif text-xl border-8 border-double border-black m-4 p-8">
            <div className="text-center max-w-lg">
                <h1 className="text-4xl font-blackletter mb-4">The Printing Press Sputtered</h1>
                <p className="mb-6">
                    A mechanical fault has occurred in our steam-driven servers.
                    The editors are furiously debating who is to blame.
                </p>
                <div className="text-sm font-mono text-gray-500 mb-6">
                    Error: {error.message || "Unknown Failure"}
                </div>
                <button
                    onClick={() => reset()}
                    className="px-6 py-2 border-2 border-black font-bold hover:bg-black hover:text-[#f4f1ea] transition-colors"
                >
                    RETRY TRANSMISSION
                </button>
            </div>
        </div>
    );
}
