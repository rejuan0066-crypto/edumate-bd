import type { MenuItemConfig } from '@/hooks/useMenuSettings';

export type MenuPathItem = {
  path: string;
  label_bn: string;
  label_en: string;
  group_bn?: string;
  group_en?: string;
};

/**
 * Flatten the nested sidebar menu tree into a de-duplicated list of pages so
 * every tab of the site can be permission-controlled from one place.
 */
export const flattenMenuPaths = (items: MenuItemConfig[] = []): MenuPathItem[] => {
  const seen = new Set<string>();
  const out: MenuPathItem[] = [];
  [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((parent) => {
      if (!seen.has(parent.path)) {
        seen.add(parent.path);
        out.push({
          path: parent.path,
          label_bn: parent.label_bn,
          label_en: parent.label_en,
          group_bn: parent.label_bn,
          group_en: parent.label_en,
        });
      }
      [...(parent.children ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .forEach((child) => {
          if (seen.has(child.path)) return;
          seen.add(child.path);
          out.push({
            path: child.path,
            label_bn: child.label_bn,
            label_en: child.label_en,
            group_bn: parent.label_bn,
            group_en: parent.label_en,
          });
        });
    });
  return out;
};

/** Merge the dynamic sidebar list with a static fallback list, keeping order. */
export const mergeMenuPaths = (
  dynamic: MenuPathItem[],
  fallback: MenuPathItem[],
): MenuPathItem[] => {
  const map = new Map<string, MenuPathItem>();
  dynamic.forEach((m) => map.set(m.path, m));
  fallback.forEach((m) => {
    if (!map.has(m.path)) map.set(m.path, m);
  });
  return Array.from(map.values());
};
