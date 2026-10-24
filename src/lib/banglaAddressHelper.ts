import { bangladeshAddresses } from '@/data/bangladeshAddresses';
import { getPostOfficeBn } from '@/data/bangladeshPostcodesBn';
import { toBnDigits, toEnDigits } from './digits';

// Translation caches
const enToBnMap = new Map<string, string>();
const bnToEnMap = new Map<string, string>();

// Initialize mappings from static dataset
bangladeshAddresses.forEach((div) => {
  if (div.name && div.nameEn) {
    enToBnMap.set(div.nameEn.trim().toLowerCase(), div.name.trim());
    bnToEnMap.set(div.name.trim().toLowerCase(), div.nameEn.trim());
  }
  div.districts.forEach((dist) => {
    if (dist.name && dist.nameEn) {
      enToBnMap.set(dist.nameEn.trim().toLowerCase(), dist.name.trim());
      bnToEnMap.set(dist.name.trim().toLowerCase(), dist.nameEn.trim());
    }
    dist.upazilas.forEach((upz) => {
      const cleanUpzBn = upz.name.replace(/\s*(উপজেলা|পৌরসভা|সিটি কর্পোরেশন|ক্যান্টনমেন্ট)/g, '').trim();
      if (upz.name && upz.nameEn) {
        enToBnMap.set(upz.nameEn.trim().toLowerCase(), cleanUpzBn || upz.name.trim());
        bnToEnMap.set(upz.name.trim().toLowerCase(), upz.nameEn.trim());
        if (cleanUpzBn) bnToEnMap.set(cleanUpzBn.toLowerCase(), upz.nameEn.trim());
      }
      (upz.unions || []).forEach((un) => {
        if (un.name && un.nameEn) {
          enToBnMap.set(un.nameEn.trim().toLowerCase(), un.name.trim());
          bnToEnMap.set(un.name.trim().toLowerCase(), un.nameEn.trim());
        }
      });
      (upz.postOffices || []).forEach((po) => {
        const poBn = getPostOfficeBn(po.nameEn, po.code);
        if (poBn && po.nameEn) {
          enToBnMap.set(po.nameEn.trim().toLowerCase(), poBn.trim());
          if (po.code) {
            enToBnMap.set(`${po.nameEn.trim().toLowerCase()} - ${po.code.trim()}`, `${poBn.trim()} - ${po.code.trim()}`);
            enToBnMap.set(`${po.nameEn.trim().toLowerCase()}-${po.code.trim()}`, `${poBn.trim()} - ${po.code.trim()}`);
          }
        }
      });
    });
  });
});

/**
 * Translates an individual address component (division, district, upazila, or post office)
 * into Bengali if bn=true.
 */
export function translateAddressComponent(text: string | null | undefined, bn = true): string {
  if (!text) return '';
  const s = String(text).trim();
  if (!s) return '';

  if (!bn) {
    return bnToEnMap.get(s.toLowerCase()) || s;
  }

  // Check direct match
  const direct = enToBnMap.get(s.toLowerCase());
  if (direct) return direct;

  // Check post office with code pattern: "Name - 1234"
  const poMatch = s.match(/^(.+?)\s*-\s*([0-9০-৯]+)$/);
  if (poMatch) {
    const rawName = poMatch[1].trim();
    const codeEn = toEnDigits(poMatch[2].trim());
    const bnName = getPostOfficeBn(rawName, codeEn) || enToBnMap.get(rawName.toLowerCase()) || rawName;
    return `${bnName} - ${toBnDigits(codeEn)}`;
  }

  return s;
}

/**
 * Formats an AddressData object into a clean, human-readable address string.
 * When bn=true:
 * - Translates all English division, district, upazila, and post office names to Bengali.
 * - Deduplicates consecutive identical entries (e.g. avoids "সিলেট, সিলেট" or "ফেঞ্চুগঞ্জ, ফেঞ্চুগঞ্জ").
 */
export function formatAddress(addr: any, bn = true): string {
  if (!addr) return '';
  if (typeof addr === 'string') {
    // If the input is already a serialized string, translate known English tokens
    return addr
      .split(',')
      .map(part => translateAddressComponent(part.trim(), bn))
      .filter((part, idx, arr) => part && (idx === 0 || part.toLowerCase() !== arr[idx - 1].toLowerCase()))
      .join(', ');
  }

  const village = addr.village?.trim();
  const postOffice = translateAddressComponent(addr.postOffice, bn)?.trim();
  const union = translateAddressComponent(addr.union, bn)?.trim();
  const upazila = translateAddressComponent(addr.upazila, bn)?.trim();
  const district = translateAddressComponent(addr.district, bn)?.trim();
  const division = translateAddressComponent(addr.division, bn)?.trim();

  const parts = [village, postOffice, union, upazila, district, division].filter(Boolean) as string[];

  // Deduplicate consecutive identical parts
  const deduplicated: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const current = parts[i];
    const prev = deduplicated[deduplicated.length - 1];
    if (prev && prev.toLowerCase() === current.toLowerCase()) {
      continue;
    }
    deduplicated.push(current);
  }

  return deduplicated.join(', ');
}

export default formatAddress;
