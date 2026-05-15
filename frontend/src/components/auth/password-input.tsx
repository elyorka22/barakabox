'use client';

import { useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  wrapperClassName?: string;
};

export function PasswordInput({ className = '', wrapperClassName = '', id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        id={inputId}
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        onClick={() => {
          setVisible((v) => !v);
          const el = inputRef.current;
          if (el) {
            const pos = el.selectionStart;
            el.focus();
            if (pos != null) el.setSelectionRange(pos, pos);
          }
        }}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] transition active:bg-[#F3F4F6]"
      >
        {visible ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
      </button>
    </div>
  );
}
