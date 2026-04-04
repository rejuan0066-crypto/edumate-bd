import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReceiptElement {
  id: string;
  type: 'text' | 'placeholder' | 'shape' | 'logo' | 'qr' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  placeholder?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shapeType?: 'rect' | 'circle' | 'line';
  fontFamily?: string;
}

export interface ReceiptDesignConfig {
  paperSize: string;
  receiptWidth: number;
  receiptHeight: number;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  elements: ReceiptElement[];
  receiptsPerPage: number;
  showCutLines: boolean;
  duplicateCopy: boolean;
}

export const DEFAULT_DESIGN: ReceiptDesignConfig = {
  paperSize: 'a4_3up',
  receiptWidth: 280,
  receiptHeight: 180,
  bgColor: '#ffffff',
  borderColor: '#cccccc',
  borderWidth: 1,
  receiptsPerPage: 3,
  showCutLines: true,
  duplicateCopy: true,
  elements: [
    { id: 'logo', type: 'logo', x: 10, y: 8, width: 30, height: 30, content: '' },
    { id: 'inst_name', type: 'text', x: 50, y: 8, width: 180, height: 16, content: '{institution_name}', fontSize: 13, fontWeight: 'bold', color: '#000000', textAlign: 'center', fontFamily: 'bengali' },
    { id: 'inst_addr', type: 'text', x: 50, y: 24, width: 180, height: 10, content: '{institution_address}', fontSize: 8, color: '#666666', textAlign: 'center', fontFamily: 'bengali' },
    { id: 'title', type: 'text', x: 60, y: 40, width: 160, height: 14, content: 'ফি রিসিট', fontSize: 11, fontWeight: 'bold', color: '#333333', textAlign: 'center', fontFamily: 'bengali' },
    { id: 'hr1', type: 'line', x: 10, y: 38, width: 260, height: 2, color: '#333333', borderWidth: 1 },
    { id: 'name_label', type: 'text', x: 10, y: 58, width: 50, height: 12, content: 'নাম:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'name_val', type: 'placeholder', x: 62, y: 58, width: 100, height: 12, placeholder: '{student_name}', fontSize: 9, color: '#111111', fontFamily: 'bengali' },
    { id: 'id_label', type: 'text', x: 10, y: 72, width: 50, height: 12, content: 'আইডি:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'id_val', type: 'placeholder', x: 62, y: 72, width: 100, height: 12, placeholder: '{student_id}', fontSize: 9, color: '#111111', fontFamily: 'bengali' },
    { id: 'roll_label', type: 'text', x: 10, y: 86, width: 50, height: 12, content: 'রোল:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'roll_val', type: 'placeholder', x: 62, y: 86, width: 100, height: 12, placeholder: '{roll_no}', fontSize: 9, color: '#111111', fontFamily: 'bengali' },
    { id: 'fee_label', type: 'text', x: 10, y: 100, width: 50, height: 12, content: 'ফি ধরন:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'fee_val', type: 'placeholder', x: 62, y: 100, width: 100, height: 12, placeholder: '{fee_type}', fontSize: 9, color: '#111111', fontFamily: 'bengali' },
    { id: 'amount_label', type: 'text', x: 10, y: 114, width: 50, height: 14, content: 'পরিমাণ:', fontSize: 10, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'amount_val', type: 'placeholder', x: 62, y: 114, width: 100, height: 14, placeholder: '{amount}', fontSize: 11, fontWeight: 'bold', color: '#000000', fontFamily: 'bengali' },
    { id: 'txn_label', type: 'text', x: 10, y: 130, width: 50, height: 12, content: 'TXN:', fontSize: 8, fontWeight: 'bold', color: '#555555' },
    { id: 'txn_val', type: 'placeholder', x: 62, y: 130, width: 120, height: 12, placeholder: '{transaction_id}', fontSize: 7, color: '#111111' },
    { id: 'date_label', type: 'text', x: 10, y: 142, width: 50, height: 12, content: 'তারিখ:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'date_val', type: 'placeholder', x: 62, y: 142, width: 100, height: 12, placeholder: '{date}', fontSize: 9, color: '#111111', fontFamily: 'bengali' },
    { id: 'status_label', type: 'text', x: 10, y: 156, width: 50, height: 12, content: 'স্ট্যাটাস:', fontSize: 9, fontWeight: 'bold', color: '#555555', fontFamily: 'bengali' },
    { id: 'status_val', type: 'placeholder', x: 62, y: 156, width: 100, height: 12, placeholder: '{status}', fontSize: 9, fontWeight: 'bold', color: '#22c55e', fontFamily: 'bengali' },
    { id: 'qr', type: 'qr', x: 220, y: 58, width: 55, height: 55, content: '' },
    { id: 'sig_collector', type: 'text', x: 10, y: 168, width: 70, height: 12, content: '{collector_name}', fontSize: 7, color: '#888888', textAlign: 'center', fontFamily: 'bengali' },
    { id: 'sig_approver', type: 'text', x: 200, y: 168, width: 70, height: 12, content: '{approver_name}', fontSize: 7, color: '#888888', textAlign: 'center', fontFamily: 'bengali' },
  ],
};

export const PAPER_SIZES: Record<string, { label: string; labelBn: string; width: number; height: number; receiptsPerPage: number }> = {
  a4_3up: { label: 'A4 - 3 Receipts', labelBn: 'A4 - ৩টি রিসিট', width: 280, height: 180, receiptsPerPage: 3 },
  a4_2up: { label: 'A4 - 2 Receipts', labelBn: 'A4 - ২টি রিসিট', width: 280, height: 270, receiptsPerPage: 2 },
  a5: { label: 'A5 Single', labelBn: 'A5 একক', width: 280, height: 370, receiptsPerPage: 1 },
  thermal_80: { label: 'Thermal 80mm', labelBn: 'থার্মাল ৮০মিমি', width: 220, height: 300, receiptsPerPage: 1 },
  thermal_58: { label: 'Thermal 58mm', labelBn: 'থার্মাল ৫৮মিমি', width: 160, height: 280, receiptsPerPage: 1 },
};

export const PLACEHOLDERS = [
  { tag: '{student_name}', label: 'Student Name', labelBn: 'ছাত্রের নাম' },
  { tag: '{student_id}', label: 'Student ID', labelBn: 'ছাত্র আইডি' },
  { tag: '{roll_no}', label: 'Roll Number', labelBn: 'রোল নম্বর' },
  { tag: '{class_name}', label: 'Class', labelBn: 'ক্লাস' },
  { tag: '{session}', label: 'Session', labelBn: 'সেশন' },
  { tag: '{fee_type}', label: 'Fee Type', labelBn: 'ফি ধরন' },
  { tag: '{amount}', label: 'Amount', labelBn: 'পরিমাণ' },
  { tag: '{transaction_id}', label: 'Transaction ID', labelBn: 'ট্রানজেকশন আইডি' },
  { tag: '{date}', label: 'Date', labelBn: 'তারিখ' },
  { tag: '{status}', label: 'Status', labelBn: 'স্ট্যাটাস' },
  { tag: '{payment_method}', label: 'Payment Method', labelBn: 'পেমেন্ট মেথড' },
  { tag: '{collector_name}', label: 'Collector Name', labelBn: 'আদায়কারী' },
  { tag: '{approver_name}', label: 'Approver Name', labelBn: 'গ্রহণকারী' },
  { tag: '{institution_name}', label: 'Institution Name', labelBn: 'প্রতিষ্ঠানের নাম' },
  { tag: '{institution_address}', label: 'Address', labelBn: 'ঠিকানা' },
  { tag: '{phone}', label: 'Phone', labelBn: 'ফোন' },
];

export function useReceiptSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['receipt_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const defaultSetting = settings?.find((s: any) => s.is_default) || settings?.[0];

  const saveMutation = useMutation({
    mutationFn: async (config: { id?: string; name: string; name_bn: string; paper_size: string; design_config: ReceiptDesignConfig; is_default: boolean }) => {
      if (config.id) {
        const { error } = await supabase
          .from('receipt_settings')
          .update({
            name: config.name,
            name_bn: config.name_bn,
            paper_size: config.paper_size,
            design_config: config.design_config as any,
            is_default: config.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('receipt_settings')
          .insert({
            name: config.name,
            name_bn: config.name_bn,
            paper_size: config.paper_size,
            design_config: config.design_config as any,
            is_default: config.is_default,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt_settings'] });
    },
  });

  return { settings, defaultSetting, isLoading, saveMutation };
}
