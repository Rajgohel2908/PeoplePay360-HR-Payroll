// client/src/components/ui/Logo.jsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * PeoplePay Brand Logo Component
 * Supports PNG brand assets, icon-only mode, and link wrapping.
 */
export function Logo({
  variant = 'light',
  size = 'md',
  showText = true,
  withLink = false,
  className = '',
  imgClassName = '',
  alt = 'PeoplePay360 HR & Payroll'
}) {
  const sizeClasses = {
    xs: variant === 'icon' ? 'w-6 h-6' : 'h-6 w-auto',
    sm: variant === 'icon' || !showText ? 'w-8 h-8' : 'h-8 w-auto',
    md: variant === 'icon' || !showText ? 'w-9 h-9' : 'h-9 w-auto',
    lg: variant === 'icon' || !showText ? 'w-12 h-12' : 'h-12 w-auto',
    xl: variant === 'icon' || !showText ? 'w-16 h-16' : 'h-16 w-auto',
    '2xl': variant === 'icon' || !showText ? 'w-24 h-24' : 'h-24 w-auto',
    '3xl': variant === 'icon' || !showText ? 'w-32 h-32' : 'h-32 w-auto',
    'hero': variant === 'icon' || !showText ? 'w-48 h-48' : 'h-24 sm:h-32 lg:h-40 w-auto max-w-full'
  };

  const selectedSize = sizeClasses[size] || size;

  let src = '/logo-trimmed.png';
  if (variant === 'icon' || !showText) {
    src = '/logo-icon.png';
  } else if (variant === 'dark') {
    src = '/logo-dark.png';
  }

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`object-contain select-none transition-transform duration-200 ${selectedSize} ${imgClassName}`}
        draggable="false"
      />
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-flex items-center group focus:outline-none" title="PeoplePay360">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
