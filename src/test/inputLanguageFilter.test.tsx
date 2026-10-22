import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  detectInputLang,
  filterEnglishInput,
  filterBanglaInput,
} from '@/lib/inputLanguageFilter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BijoyProvider, useBijoy } from '@/contexts/BijoyContext';

describe('inputLanguageFilter unit logic', () => {
  it('detects English input fields properly', () => {
    expect(detectInputLang({ type: 'email' })).toBe('en');
    expect(detectInputLang({ type: 'url' })).toBe('en');
    expect(detectInputLang({ type: 'tel' })).toBe('en');
    expect(detectInputLang({ name: 'student_name_en' })).toBe('en');
    expect(detectInputLang({ id: 'guardian_phone' })).toBe('en');
    expect(detectInputLang({ name: 'username' })).toBe('en');
    expect(detectInputLang({ placeholder: 'e.g. Madrasah' })).toBe('en');
    expect(detectInputLang({ placeholder: 'ইংরেজিতে লিখুন' })).toBe('en');
    expect(detectInputLang({ name: 'last_name' })).toBe('en');
    expect(detectInputLang({ name: 'father_name_en' })).toBe('en');
  });

  it('detects Bangla input fields properly', () => {
    expect(detectInputLang({ name: 'student_name_bn' })).toBe('bn');
    expect(detectInputLang({ id: 'address_bn' })).toBe('bn');
    expect(detectInputLang({ name: 'father_name_bn' })).toBe('bn');
    expect(detectInputLang({ placeholder: 'বাংলায় লিখুন' })).toBe('bn');
    expect(detectInputLang({ placeholder: 'মাদরাসার নাম (বাংলা)' })).toBe('bn');
  });

  it('keeps generic fields with Bengali UI placeholders as auto', () => {
    expect(detectInputLang({ placeholder: 'ইউজারের নাম' })).toBe('auto');
    expect(detectInputLang({ placeholder: 'মাদরাসার নাম' })).toBe('auto');
    expect(detectInputLang({ name: 'fullName', placeholder: 'ইউজারের নাম' })).toBe('auto');
  });

  it('never modifies password inputs', () => {
    expect(detectInputLang({ type: 'password' })).toBe('auto');
  });

  it('filters English inputs: converts Bangla digits to English and strips Bangla and Arabic letters', () => {
    // Digits converted
    expect(filterEnglishInput('১২৩৪৫')).toBe('12345');
    // Mixed digits
    expect(filterEnglishInput('Order #১২৩')).toBe('Order #123');
    // Bangla letters stripped
    expect(filterEnglishInput('রহিম রহিম')).toBe(' ');
    expect(filterEnglishInput('User রহিম ১২৩')).toBe('User  123');
    // Arabic letters stripped
    expect(filterEnglishInput('User محمد 123')).toBe('User  123');
  });

  it('filters Bangla inputs: converts English digits to Bangla digits', () => {
    expect(filterBanglaInput('12345')).toBe('১২৩৪৫');
    expect(filterBanglaInput('খরচ: 500 টাকা')).toBe('খরচ: ৫০০ টাকা');
  });
});

describe('Input Component language handling', () => {
  it('automatically converts Bangla digits to English in an English field', () => {
    let value = '';
    render(
      <Input
        name="student_phone"
        placeholder="e.g. 01711000000"
        onChange={(e) => {
          value = e.target.value;
        }}
        data-testid="phone-input"
      />
    );

    const input = screen.getByTestId('phone-input') as HTMLInputElement;
    expect(input.getAttribute('data-lang')).toBe('en');

    fireEvent.change(input, { target: { value: '০১৭৪৯৮৪২৪০১' } });
    expect(value).toBe('01749842401');
  });

  it('strips Bengali letters typed or pasted into an English field', () => {
    let value = '';
    render(
      <Input
        name="username"
        onChange={(e) => {
          value = e.target.value;
        }}
        data-testid="user-input"
      />
    );

    const input = screen.getByTestId('user-input') as HTMLInputElement;
    expect(input.getAttribute('data-lang')).toBe('en');

    fireEvent.change(input, { target: { value: 'adminবাংলা' } });
    expect(value).toBe('admin');
  });

  it('automatically converts English digits to Bangla digits in a Bangla field', () => {
    let value = '';
    render(
      <Input
        name="name_bn"
        placeholder="যেমন: মাদরাসা"
        onChange={(e) => {
          value = e.target.value;
        }}
        data-testid="bn-input"
      />
    );

    const input = screen.getByTestId('bn-input') as HTMLInputElement;
    expect(input.getAttribute('data-lang')).toBe('bn');

    fireEvent.change(input, { target: { value: 'মাদরাসা 123' } });
    expect(value).toBe('মাদরাসা ১২৩');
  });
});

describe('Textarea Component language handling', () => {
  it('handles Bangla digits conversion in English textarea', () => {
    let value = '';
    render(
      <Textarea
        name="remarks_en"
        onChange={(e) => {
          value = e.target.value;
        }}
        data-testid="en-textarea"
      />
    );

    const textarea = screen.getByTestId('en-textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('data-lang')).toBe('en');

    fireEvent.change(textarea, { target: { value: 'Note: ১২৩' } });
    expect(value).toBe('Note: 123');
  });
});
