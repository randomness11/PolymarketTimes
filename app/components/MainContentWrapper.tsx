'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface MainContentWrapperProps {
    children: ReactNode;
}

/**
 * Wraps main content with error boundary for graceful component-level error handling.
 * Used as a client component bridge for Server Component pages.
 */
export default function MainContentWrapper({ children }: MainContentWrapperProps) {
    return (
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    );
}
