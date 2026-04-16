'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-stone">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-coal px-4 py-2.5 text-sm text-bone placeholder:text-stone/60 transition-[opacity,border-color,transform] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-bone/40 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian focus:border-bone',
            error ? 'border-bone/80' : 'border-smoke',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-chalk">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
