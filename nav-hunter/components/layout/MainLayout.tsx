'use client'

import React from 'react'
import { AITerminal } from '../ai/AITerminal'
import { ConsoleLog } from '../console/ConsoleLog'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-nav-bg-main text-nav-text-main">
      {/* AI Terminal - Fixed on right */}
      <AITerminal />
      
      {/* Main content with margin for terminal and console */}
      <div className="mr-[430px] mb-[220px]">
        <div className="max-w-[1200px] mx-auto p-2.5">
          {children}
        </div>
      </div>
      
      {/* Console Log - Fixed at bottom */}
      <ConsoleLog />
    </div>
  )
}