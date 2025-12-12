'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  maxLength?: number;
  showHomeIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// ICON COMPONENTS
// ============================================

const ChevronIcon = () => (
  <svg
    className="w-4 h-4 text-slate-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = () => (
  <svg
    data-testid="home-icon"
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const getIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    home: <HomeIcon />,
    folder: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  };
  return icons[iconName] || null;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const truncateLabel = (label: string, maxLength?: number): string => {
  if (!maxLength || label.length <= maxLength) return label;
  return label.slice(0, maxLength).trimEnd() + '...';
};

const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  return sizes[size];
};

// ============================================
// COMPONENT
// ============================================

export function Breadcrumbs({
  items,
  separator,
  maxItems,
  maxLength,
  showHomeIcon = false,
  size = 'md',
  className = '',
}: BreadcrumbsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const id = useId();

  // Handle empty items
  if (items.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className={`${getSizeClasses(size)} ${className}`}>
        <ol className="flex items-center gap-2" />
      </nav>
    );
  }

  // Determine if we need to collapse items
  const shouldCollapse = maxItems && items.length > maxItems && !isExpanded;

  let displayItems = items;
  if (shouldCollapse) {
    // Show first item, ellipsis, and last item(s)
    const firstItem = items[0];
    const lastItems = items.slice(-1);
    displayItems = [firstItem, ...lastItems];
  }

  const renderSeparator = (index: number) => {
    if (separator) {
      return (
        <span data-testid="breadcrumb-separator" aria-hidden="true" className="text-slate-500">
          {separator}
        </span>
      );
    }
    return (
      <span data-testid="breadcrumb-separator" aria-hidden="true">
        <ChevronIcon />
      </span>
    );
  };

  const renderItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const truncatedLabel = truncateLabel(item.label, maxLength);
    const isTruncated = truncatedLabel !== item.label;
    const isFirst = index === 0;

    const content = (
      <>
        {item.icon && (
          <span data-testid={`icon-${item.icon}`} className="mr-1">
            {getIcon(item.icon)}
          </span>
        )}
        {isFirst && showHomeIcon && !item.icon && (
          <span className="mr-1">
            <HomeIcon />
          </span>
        )}
        <span
          className={isTruncated ? 'truncate' : ''}
          title={isTruncated ? item.label : undefined}
        >
          {truncatedLabel}
        </span>
      </>
    );

    if (isLast) {
      return (
        <span className="flex items-center text-slate-300 font-medium">
          {item.icon && (
            <span data-testid={`icon-${item.icon}`} className="mr-1">
              {getIcon(item.icon)}
            </span>
          )}
          {isFirst && showHomeIcon && !item.icon && (
            <span className="mr-1">
              <HomeIcon />
            </span>
          )}
          <span
            aria-current="page"
            className={isTruncated ? 'truncate' : ''}
            title={isTruncated ? item.label : undefined}
          >
            {truncatedLabel}
          </span>
        </span>
      );
    }

    return (
      <Link
        href={item.href}
        className="flex items-center text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
      >
        {content}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`${getSizeClasses(size)} ${className}`}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const actualIndex = shouldCollapse && index > 0 ? items.length - 1 : index;

          // Insert ellipsis after first item when collapsed
          const showEllipsis = shouldCollapse && index === 0;

          return (
            <React.Fragment key={`${id}-${index}`}>
              <li className="flex items-center">
                {renderItem(item, actualIndex, isLast && !showEllipsis)}
              </li>

              {showEllipsis && (
                <>
                  <li className="flex items-center">
                    {renderSeparator(index)}
                  </li>
                  <li>
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label="Show more breadcrumbs"
                    >
                      ...
                    </button>
                  </li>
                </>
              )}

              {!isLast && (
                <li className="flex items-center" aria-hidden="true">
                  {renderSeparator(index)}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
