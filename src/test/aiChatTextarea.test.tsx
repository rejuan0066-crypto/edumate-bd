/**
 * Verifies the AI chat composer textarea stays visible (text + caret) and
 * keeps updating its value while typing — including under the global Bijoy
 * keyboard interceptor and during IME composition events.
 *
 * These tests focus on behaviour, not pixel-perfect colors. CSS specificity
 * for the `.ai-chat-textarea` opt-out is exercised by injecting the same
 * global rules that `src/index.css` applies to plain <textarea> elements.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BijoyProvider, useBijoy } from '@/contexts/BijoyContext';

/** Mirror of the global textarea rules from src/index.css (the parts that
 *  could hide chat text if specificity wasn't strong enough). */
const GLOBAL_TEXTAREA_CSS = `
  textarea:not(.ai-chat-textarea) {
    background-color: #ffffff;
    color: #111111;
  }
  textarea:not(.ai-chat-textarea):focus {
    background-color: #ffffff;
    color: #111111;
  }
  textarea.ai-chat-textarea {
    background-color: transparent;
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
    caret-color: #ffffff;
  }
`;

let styleEl: HTMLStyleElement;

beforeEach(() => {
  styleEl = document.createElement('style');
  styleEl.textContent = GLOBAL_TEXTAREA_CSS;
  document.head.appendChild(styleEl);
  try { localStorage.removeItem('bijoy-mode'); } catch {}
});

afterEach(() => {
  styleEl?.remove();
  try { localStorage.removeItem('bijoy-mode'); } catch {}
});

/** Tiny controlled textarea harness — same className/data-attr as the real
 *  AI chat composer in DesignAiChatBar. */
const ChatHarness = () => {
  const [value, setValue] = useState('');
  return (
    <textarea
      data-testid="chat"
      data-ai-chat-input
      className="ai-chat-textarea"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

const BijoyToggle = () => {
  const { bijoyEnabled, setBijoyEnabled } = useBijoy();
  return (
    <button
      data-testid="bijoy-toggle"
      data-enabled={bijoyEnabled ? 'true' : 'false'}
      onClick={() => setBijoyEnabled(!bijoyEnabled)}
    >
      toggle
    </button>
  );
};

describe('AI chat textarea — visibility & input behaviour', () => {
  it('opts out of the global white-background rule (text stays readable on dark UI)', () => {
    render(<ChatHarness />);
    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;

    const styles = window.getComputedStyle(ta);
    // Transparent background means the dark composer behind it shows through.
    expect(styles.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    // White text on the dark composer (accept either rgb() or hex form).
    expect(styles.color.replace(/\s+/g, '').toLowerCase()).toMatch(/^(rgb\(255,255,255\)|#ffffff)$/);
  });

  it('updates value on every keystroke (controlled component sanity check)', () => {
    render(<ChatHarness />);
    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;

    fireEvent.change(ta, { target: { value: 'h' } });
    fireEvent.change(ta, { target: { value: 'hi' } });
    expect(ta.value).toBe('hi');
  });

  it('keeps text visible after focus (focus styles do not hide it)', () => {
    render(<ChatHarness />);
    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;

    act(() => ta.focus());
    fireEvent.change(ta, { target: { value: 'abc' } });

    const styles = window.getComputedStyle(ta);
    expect(styles.color.replace(/\s+/g, '')).toBe('rgb(255,255,255)');
    expect(ta.value).toBe('abc');
  });

  it('reflects value updates fired during IME composition (Bangla IME)', () => {
    render(<ChatHarness />);
    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;

    // Simulate a typical Bangla IME composing "অ" then committing "অআ"
    fireEvent.compositionStart(ta, { data: '' });
    fireEvent.compositionUpdate(ta, { data: 'অ' });
    fireEvent.change(ta, { target: { value: 'অ' } });
    expect(ta.value).toBe('অ');

    fireEvent.compositionUpdate(ta, { data: 'অআ' });
    fireEvent.change(ta, { target: { value: 'অআ' } });
    fireEvent.compositionEnd(ta, { data: 'অআ' });

    expect(ta.value).toBe('অআ');
  });
});

describe('Bijoy keyboard mode — typed Latin keys become Unicode Bangla in chat textarea', () => {
  it('converts a Bijoy keystroke into its Unicode Bangla character inside the chat textarea', () => {
    render(
      <BijoyProvider>
        <BijoyToggle />
        <ChatHarness />
      </BijoyProvider>,
    );

    // Enable Bijoy mode
    fireEvent.click(screen.getByTestId('bijoy-toggle'));
    expect(screen.getByTestId('bijoy-toggle').getAttribute('data-enabled')).toBe('true');

    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;
    act(() => ta.focus());

    // 'j' on Bijoy Classic → 'ক' (well-known mapping). We dispatch a real
    // keydown that the global Bijoy interceptor listens for in capture phase.
    const evt = new KeyboardEvent('keydown', {
      key: 'j',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(evt, 'target', { value: ta, configurable: true });

    act(() => {
      ta.dispatchEvent(evt);
    });

    // The interceptor uses execCommand('insertText') which is a no-op in
    // jsdom — but it has a manual fallback that uses the native value setter
    // and dispatches an 'input' event. Either way, the resulting value must
    // be Unicode Bangla, not the raw Latin keystroke.
    expect(ta.value).not.toBe('j');
    expect(ta.value.length).toBeGreaterThan(0);
    // The character should be in the Bangla Unicode block (U+0980 – U+09FF).
    const code = ta.value.charCodeAt(0);
    expect(code).toBeGreaterThanOrEqual(0x0980);
    expect(code).toBeLessThanOrEqual(0x09ff);
  });

  it('does not intercept keys when Bijoy mode is disabled', () => {
    render(
      <BijoyProvider>
        <ChatHarness />
      </BijoyProvider>,
    );

    const ta = screen.getByTestId('chat') as HTMLTextAreaElement;
    act(() => ta.focus());

    const evt = new KeyboardEvent('keydown', {
      key: 'j',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      ta.dispatchEvent(evt);
    });

    // No conversion happened — value stays empty (jsdom doesn't simulate
    // browser-native typing from a bare keydown event).
    expect(ta.value).toBe('');
  });
});
