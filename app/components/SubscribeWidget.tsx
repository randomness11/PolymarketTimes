'use client';

import React, { useState } from 'react';

export default function SubscribeWidget() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage("You are now on the ledger.");
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || "Transmission failed.");
            }
        } catch (error) {
            setStatus('error');
            setMessage(" Telegraph line down.");
        }
    };

    return (
        <div className="text-center">
                <h3 className="font-blackletter text-2xl mb-1">The Daily Dispatch</h3>
                <p className="font-serif italic text-xs mb-4">
                    Receive the morrow's intelligence and exclusive predictions directly to your telegraph office.
                </p>

                {status === 'success' ? (
                    <div className="border border-black bg-[#e0ded9] p-4 mb-2 animate-success-reveal">
                        <div className="flex items-center justify-center mb-2">
                            <div className="success-checkmark">
                                <svg className="w-12 h-12" viewBox="0 0 52 52">
                                    <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                </svg>
                            </div>
                        </div>
                        <p className="font-bold text-xs uppercase tracking-widest text-green-900">Subscription Confirmed</p>
                        <p className="font-serif text-[10px] mt-1">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Your electronic address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading'}
                            required
                            className="w-full border-b border-black bg-transparent text-center font-serif text-sm px-2 py-1 mb-2 outline-none placeholder:italic placeholder:text-gray-400 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-black text-white text-[10px] uppercase font-bold py-2 hover:bg-gray-800 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Transmitting...' : 'Subscribe'}
                        </button>
                    </form>
                )}

                {status === 'error' && (
                    <div className="mt-2 text-red-900 text-[10px] font-bold uppercase tracking-widest bg-red-100/50 p-1">
                        {message}
                    </div>
                )}

                {/* Count removed */}
        </div>
    );
}
