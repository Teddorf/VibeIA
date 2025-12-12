'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  section?: string;
  badge?: number | string;
  external?: boolean;
}

export interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  showUser?: boolean;
  className?: string;
}

// ============================================
// ICON COMPONENTS
// ============================================

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

const getIcon = (iconName: string) => icons[iconName] || null;

const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

// ============================================
// COMPONENT
// ============================================

export function Sidebar({
  items,
  collapsed = false,
  onToggle,
  showUser = false,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Group items by section
  const sections = items.reduce((acc, item) => {
    const section = item.section || '';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // Match nested routes
    if (href !== '/' && pathname?.startsWith(href)) return true;
    return false;
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const showTooltip = collapsed && hoveredItem === item.name;

    const linkContent = (
      <>
        {item.icon && (
          <span data-testid={`icon-${item.icon}`} className="flex-shrink-0">
            {getIcon(item.icon)}
          </span>
        )}
        <span
          data-testid="nav-label"
          className={`transition-opacity ${collapsed ? 'hidden opacity-0 w-0' : 'opacity-100'}`}
        >
          {item.name}
        </span>
        {item.badge !== undefined && !collapsed && (
          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
            {item.badge}
          </span>
        )}
      </>
    );

    const linkClasses = `
      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
      focus:outline-none focus:ring-2 focus:ring-purple-500
      ${active
        ? 'bg-purple-500/20 text-purple-300'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }
      ${collapsed ? 'justify-center' : ''}
    `;

    const linkProps = item.external
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {};

    return (
      <div
        key={item.name}
        className="relative"
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Link
          href={item.href}
          className={linkClasses}
          aria-current={active ? 'page' : undefined}
          {...linkProps}
        >
          {linkContent}
        </Link>

        {/* Tooltip when collapsed */}
        {showTooltip && (
          <div
            role="tooltip"
            className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-50"
          >
            {item.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      aria-label="Sidebar navigation"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`
        flex flex-col h-full bg-slate-900 border-r border-slate-700/50 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
        ${className}
      `}
    >
      {/* Toggle button */}
      {onToggle && (
        <div className="p-2 border-b border-slate-700/50">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Toggle sidebar"
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>
      )}

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {Object.entries(sections).map(([sectionName, sectionItems]) => (
          <div key={sectionName || 'default'} className="mb-4">
            {/* Section header */}
            {sectionName && (
              <div
                className={`px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                  collapsed ? 'hidden' : ''
                }`}
              >
                {sectionName}
              </div>
            )}

            {/* Section items */}
            <div className="space-y-1">
              {sectionItems.map(renderNavItem)}
            </div>
          </div>
        ))}
      </div>

      {/* User info */}
      {showUser && user && (
        <div className="p-4 border-t border-slate-700/50">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Sidebar;
