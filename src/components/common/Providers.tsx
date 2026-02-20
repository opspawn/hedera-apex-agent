'use client'

import { type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from './Toast'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
