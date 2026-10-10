import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function bnToEn(str: any): string {
  if (str == null) return '';
  return String(str).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
}

export function enToBn(str: any): string {
  if (str == null) return '';
  return String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
}

export function formatDigits(val: any, isBn: boolean): string {
  if (val == null || val === '') return '';
  return isBn ? enToBn(bnToEn(val)) : bnToEn(val);
}
