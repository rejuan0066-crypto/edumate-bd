import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { bijoyCharToUnicode, isBijoyKey } from '@/lib/bijoyKeymap';

interface BijoyContextType {
  bijoyEnabled: boolean;
  setBijoyEnabled: (v: boolean) => void;
  toggleBijoy: () => void;
}

const BijoyContext = createContext<BijoyContextType>({
  bijoyEnabled: false,
  setBijoyEnabled: () => {},
  toggleBijoy: () => {},
});

export const useBijoy = () => useContext(BijoyContext);

export const BijoyProvider = ({ children }: { children: ReactNode }) => {
  const [bijoyEnabled, setBijoyEnabled] = useState(() => {
    try {
      return localStorage.getItem('bijoy-mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bijoy-mode', String(bijoyEnabled));
    } catch {}
  }, [bijoyEnabled]);

  const toggleBijoy = useCallback(() => setBijoyEnabled(prev => !prev), []);

  useEffect(() => {
    if (!bijoyEnabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT';
      const isTextarea = target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;

      if (!isInput && !isTextarea && !isContentEditable) return;

      if (target.getAttribute('data-lang') === 'en' || target.getAttribute('data-bijoy') === 'false') return;

      if (isInput) {
        const inputType = (target as HTMLInputElement).type?.toLowerCase() || 'text';
        // Passwords must remain byte-for-byte identical to the value saved by auth.
        // Never run Bijoy conversion inside a password field.
        if (inputType === 'password') return;
        if (!['text', 'search', ''].includes(inputType)) return;
      }

      const char = e.key;
      if (char.length !== 1) return;
      if (!isBijoyKey(char)) return;

      const unicodeChar = bijoyCharToUnicode(char);
      if (unicodeChar === char) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      // Use execCommand which works natively with React controlled inputs
      // It fires proper 'input' events that React's synthetic system detects
      if (isInput || isTextarea) {
        const el = target as HTMLInputElement | HTMLTextAreaElement;
        
        // Focus the element first
        el.focus();
        
        // Try execCommand first (most reliable with React)
        const success = document.execCommand('insertText', false, unicodeChar);
        
        if (!success) {
          // Fallback: manual value manipulation
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? start;
          const before = el.value.slice(0, start);
          const after = el.value.slice(end);
          const newValue = before + unicodeChar + after;
          const newCursor = start + unicodeChar.length;

          // Use native setter to bypass React's value tracking
          const proto = el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
          if (descriptor?.set) {
            descriptor.set.call(el, newValue);
          } else {
            el.value = newValue;
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          
          requestAnimationFrame(() => {
            el.setSelectionRange(newCursor, newCursor);
          });
        }
      } else if (isContentEditable) {
        document.execCommand('insertText', false, unicodeChar);
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [bijoyEnabled]);

  return (
    <BijoyContext.Provider value={{ bijoyEnabled, setBijoyEnabled, toggleBijoy }}>
      {children}
    </BijoyContext.Provider>
  );
};
