// client/src/components/ui/Logo.jsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * PeoplePay Brand Logo Component
 * Supports light backgrounds, dark backgrounds, and icon-only mode.
 *
 * @param {('light'|'dark'|'icon')} variant - 'light' for light backgrounds, 'dark' for dark backgrounds, 'icon' for square icon only
 * @param {('xs'|'sm'|'md'|'lg'|'xl')} size - Size preset
 * @param {boolean} withLink - Whether to wrap the logo in a link to dashboard/home
 * @param {string} className - Additional CSS classes
 */
export function Logo({
  variant = 'light',
  size = 'md',
  withLink = false,
  className = '',
  alt = 'PeoplePay - payroll, minus the paperwork'
}) {
  const sizeClasses = {
    xs: variant === 'icon' ? 'w-6 h-6' : 'h-6 w-auto',
    sm: variant === 'icon' ? 'w-8 h-8' : 'h-8 w-auto',
    md: variant === 'icon' ? 'w-10 h-10' : 'h-10 w-auto',
    lg: variant === 'icon' ? 'w-12 h-12' : 'h-12 w-auto',
    xl: variant === 'icon' ? 'w-16 h-16' : 'h-16 w-auto'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  let src = '/logo-trimmed.png';
  if (variant === 'icon') {
    src = '/logo-icon.png';
  } else if (variant === 'dark') {
    src = '/logo-dark.png';
  }

  const image = (
    <img
      src={src}
      alt={alt}
      className={`object-contain select-none transition-transform duration-200 ${selectedSize} ${className}`}
      draggable="false"
    />
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-flex items-center group focus:outline-none" title="PeoplePay">
        {image}
      </Link>
    );
  }

  return image;
}

export default Logo;
