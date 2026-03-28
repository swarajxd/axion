import { type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className = '', ...props }: InputProps) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/80 ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-surface-container-low border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all duration-300 outline-none text-on-surface placeholder:text-outline-variant/50 ${className}`}
        {...props}
      />
    </div>
  );
};
