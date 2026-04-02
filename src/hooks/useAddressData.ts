import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { bangladeshAddresses, type Division, type District, type Upazila, type Union, type PostOffice } from '@/data/bangladeshAddresses';

export interface AddressCustomEntry {
  id: string;
  level: string;
  parent_path: string | null;
  name: string;
  name_en: string;
  sub_type: string | null;
  post_code: string | null;
  action: string;
  original_name_en: string | null;
  is_active: boolean;
  sort_order: number;
}

export const useAddressCustomEntries = () => {
  return useQuery({
    queryKey: ['address-custom'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('address_custom')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as AddressCustomEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useMergedAddressData = () => {
  const { data: customEntries = [] } = useAddressCustomEntries();

  const getDivisions = (): Division[] => {
    const edits = customEntries.filter(e => e.level === 'division' && e.action === 'edit');
    const additions = customEntries.filter(e => e.level === 'division' && e.action === 'add');

    const merged = bangladeshAddresses.map(div => {
      const edit = edits.find(e => e.original_name_en === div.nameEn);
      if (edit) return { ...div, name: edit.name, nameEn: edit.name_en };
      return div;
    });

    additions.forEach(a => {
      if (!merged.some(d => d.nameEn === a.name_en)) {
        merged.push({ name: a.name, nameEn: a.name_en, districts: [] });
      }
    });

    return merged;
  };

  const getDistricts = (divisionNameEn: string): District[] => {
    const div = getDivisions().find(d => d.nameEn === divisionNameEn);
    const staticDiv = bangladeshAddresses.find(d => d.nameEn === divisionNameEn);
    const baseDistricts = staticDiv?.districts || [];

    const edits = customEntries.filter(e => e.level === 'district' && e.action === 'edit' && e.parent_path === divisionNameEn);
    const additions = customEntries.filter(e => e.level === 'district' && e.action === 'add' && e.parent_path === divisionNameEn);

    const merged = baseDistricts.map(dist => {
      const edit = edits.find(e => e.original_name_en === dist.nameEn);
      if (edit) return { ...dist, name: edit.name, nameEn: edit.name_en };
      return dist;
    });

    additions.forEach(a => {
      if (!merged.some(d => d.nameEn === a.name_en)) {
        merged.push({ name: a.name, nameEn: a.name_en, upazilas: [] });
      }
    });

    return merged;
  };

  const getUpazilas = (divisionNameEn: string, districtNameEn: string): Upazila[] => {
    const parentPath = `${divisionNameEn}/${districtNameEn}`;
    const staticDiv = bangladeshAddresses.find(d => d.nameEn === divisionNameEn);
    const staticDist = staticDiv?.districts.find(d => d.nameEn === districtNameEn);
    const baseUpazilas = staticDist?.upazilas || [];

    const edits = customEntries.filter(e => e.level === 'upazila' && e.action === 'edit' && e.parent_path === parentPath);
    const additions = customEntries.filter(e => e.level === 'upazila' && e.action === 'add' && e.parent_path === parentPath);

    const merged = baseUpazilas.map(upz => {
      const edit = edits.find(e => e.original_name_en === upz.nameEn);
      if (edit) return { ...upz, name: edit.name, nameEn: edit.name_en, type: (edit.sub_type || upz.type) as any };
      return upz;
    });

    additions.forEach(a => {
      if (!merged.some(u => u.nameEn === a.name_en)) {
        merged.push({ name: a.name, nameEn: a.name_en, type: (a.sub_type || 'upazila') as any, unions: [], postOffices: [] });
      }
    });

    return merged;
  };

  const getUnions = (divisionNameEn: string, districtNameEn: string, upazilaNameEn: string): Union[] => {
    const parentPath = `${divisionNameEn}/${districtNameEn}/${upazilaNameEn}`;
    const staticDiv = bangladeshAddresses.find(d => d.nameEn === divisionNameEn);
    const staticDist = staticDiv?.districts.find(d => d.nameEn === districtNameEn);
    const staticUpz = staticDist?.upazilas.find(u => u.nameEn === upazilaNameEn);
    const baseUnions = staticUpz?.unions || [];

    const edits = customEntries.filter(e => e.level === 'union' && e.action === 'edit' && e.parent_path === parentPath);
    const additions = customEntries.filter(e => e.level === 'union' && e.action === 'add' && e.parent_path === parentPath);

    const merged = baseUnions.map(u => {
      const edit = edits.find(e => e.original_name_en === u.nameEn);
      if (edit) return { ...u, name: edit.name, nameEn: edit.name_en };
      return u;
    });

    additions.forEach(a => {
      if (!merged.some(u => u.nameEn === a.name_en)) {
        merged.push({ name: a.name, nameEn: a.name_en });
      }
    });

    return merged;
  };

  const getPostOffices = (divisionNameEn: string, districtNameEn: string, upazilaNameEn: string): PostOffice[] => {
    const parentPath = `${divisionNameEn}/${districtNameEn}/${upazilaNameEn}`;
    const staticDiv = bangladeshAddresses.find(d => d.nameEn === divisionNameEn);
    const staticDist = staticDiv?.districts.find(d => d.nameEn === districtNameEn);
    const staticUpz = staticDist?.upazilas.find(u => u.nameEn === upazilaNameEn);
    const basePOs = staticUpz?.postOffices || [];

    const edits = customEntries.filter(e => e.level === 'post_office' && e.action === 'edit' && e.parent_path === parentPath);
    const additions = customEntries.filter(e => e.level === 'post_office' && e.action === 'add' && e.parent_path === parentPath);

    const merged = basePOs.map(po => {
      const edit = edits.find(e => e.original_name_en === po.nameEn);
      if (edit) return { ...po, name: edit.name, nameEn: edit.name_en, code: edit.post_code || po.code };
      return po;
    });

    additions.forEach(a => {
      if (!merged.some(p => p.nameEn === a.name_en)) {
        merged.push({ name: a.name, nameEn: a.name_en, code: a.post_code || '' });
      }
    });

    return merged;
  };

  return { getDivisions, getDistricts, getUpazilas, getUnions, getPostOffices, customEntries };
};
