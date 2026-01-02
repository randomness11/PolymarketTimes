'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary for graceful error handling.
 * Provides a Victorian-themed fallback UI when child components fail.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default Victorian-themed error UI
            return (
                <div className="border-4 border-double border-black p-8 bg-[#f4f1ea] text-center font-serif">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h2 className="text-2xl font-blackletter mb-4">
                        The Printing Press Hath Jammed
                    </h2>
                    <p className="text-lg mb-4 italic">
                        Our mechanical scribes have encountered an unexpected difficulty.
                    </p>
                    <p className="text-sm text-gray-600 mb-6">
                        Technical Note: {this.state.error?.message || 'Unknown error'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="border-2 border-black px-6 py-2 uppercase tracking-wider text-sm hover:bg-black hover:text-white transition-colors"
                    >
                        Attempt Repair
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

export default ErrorBoundary;
