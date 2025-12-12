'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from './Header';
import { Sidebar, NavItem } from './Sidebar';

// ============================================
// TYPES
// ============================================

export interface AppShellProps {
  children: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const defaultNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home', section: 'Main' },
  { name: 'Projects', href: '/projects', icon: 'folder', section: 'Main' },
  { name: 'New Project', href: '/new-project', icon: 'folder', section: 'Main' },
  { name: 'Settings', href: '/settings', icon: 'settings', section: 'Account' },
];

// ============================================
// COMPONENT
// ============================================

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
    }
  }, []);

  // Handle responsive
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="appshell-loading" className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-700" />
          <div className="h-4 w-32 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  // Unauthenticated - full width, no sidebar
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main role="main" className="w-full">
          {children}
        </main>
      </div>
    );
  }

  // Authenticated - with sidebar
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile menu button - shown on small screens */}
        {isMobile && (
          <button
            onClick={handleOpenMobileMenu}
            className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg md:hidden focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Open mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <aside className={`${isMobile ? 'hidden' : 'block'}`}>
          <Sidebar
            items={defaultNavItems}
            collapsed={sidebarCollapsed}
            onToggle={handleToggleSidebar}
            showUser={true}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobile && isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Sidebar */}
            <div className="relative z-50">
              <Sidebar
                items={defaultNavItems}
                collapsed={false}
                showUser={true}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <main
          role="main"
          className={`
            flex-1 overflow-auto
            ${!isMobile && !sidebarCollapsed ? 'ml-0' : ''}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
