'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  helperText,
  icon,
  type = 'text',
  className = '',
  id,
  required,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helperText && !error && (
          <span className="text-[11px] text-slate-400">{helperText}</span>
        )}
      </div>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          type={resolvedType}
          required={required}
          className={`block w-full rounded-md border bg-white ${
            icon ? 'pl-9' : 'pl-3'
          } ${
            isPassword ? 'pr-9' : 'pr-3'
          } py-2.5 sm:py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={showPassword ? 'Hide key' : 'Show key'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1 text-[11px] text-red-600 font-medium mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

