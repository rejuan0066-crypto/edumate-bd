import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface ValidationRule {
  id: string;
  name: string;
  name_bn: string;
  module: string;
  rule_level: string;
  field_name: string | null;
  rule_type: string;
  config: Record<string, any>;
  error_message: string | null;
  error_message_bn: string | null;
  is_active: boolean;
}

export const useValidationRules = (module: string) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: rules = [] } = useQuery({
    queryKey: ['validation-rules', module],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('*')
        .eq('module', module)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as ValidationRule[];
    },
  });

  const validate = (fieldName: string, value: any, allValues?: Record<string, any>): string | null => {
    const fieldRules = rules.filter(r => r.field_name === fieldName);
    
    for (const rule of fieldRules) {
      const errorMsg = bn ? rule.error_message_bn : rule.error_message;
      const config = typeof rule.config === 'object' ? rule.config : {};

      switch (rule.rule_type) {
        case 'required':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return errorMsg || (bn ? 'এই ফিল্ডটি আবশ্যক' : 'This field is required');
          }
          break;

        case 'regex':
          if (value && config.pattern) {
            const regex = new RegExp(config.pattern);
            if (!regex.test(String(value))) {
              return errorMsg || (bn ? 'সঠিক ফরম্যাটে লিখুন' : 'Invalid format');
            }
          }
          break;

        case 'min_length':
          if (value && String(value).length < (config.min || 0)) {
            return errorMsg || (bn ? `সর্বনিম্ন ${config.min} অক্ষর প্রয়োজন` : `Minimum ${config.min} characters required`);
          }
          break;

        case 'max_length':
          if (value && String(value).length > (config.max || 999)) {
            return errorMsg || (bn ? `সর্বোচ্চ ${config.max} অক্ষর` : `Maximum ${config.max} characters`);
          }
          break;

        case 'range':
          if (value !== undefined && value !== '') {
            const num = Number(value);
            if (config.min !== undefined && num < config.min) {
              return errorMsg || (bn ? `সর্বনিম্ন ${config.min}` : `Minimum value is ${config.min}`);
            }
            if (config.max !== undefined && num > config.max) {
              return errorMsg || (bn ? `সর্বোচ্চ ${config.max}` : `Maximum value is ${config.max}`);
            }
          }
          break;

        case 'max_value':
          if (value !== undefined && allValues && config.compare_field) {
            const compareVal = Number(allValues[config.compare_field]);
            if (Number(value) > compareVal) {
              return errorMsg || (bn ? `মান ${config.compare_field} এর চেয়ে বেশি হতে পারবে না` : `Value cannot exceed ${config.compare_field}`);
            }
          }
          break;

        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            return errorMsg || (bn ? 'সঠিক ইমেইল দিন' : 'Invalid email');
          }
          break;

        case 'phone':
          if (value && !/^01[3-9]\d{8}$/.test(String(value).replace(/[^0-9]/g, ''))) {
            return errorMsg || (bn ? 'সঠিক মোবাইল নম্বর দিন' : 'Invalid phone number');
          }
          break;
      }
    }
    return null;
  };

  const validateAll = (values: Record<string, any>): Record<string, string> => {
    const errors: Record<string, string> = {};
    const fieldNames = new Set(rules.map(r => r.field_name).filter(Boolean));
    
    fieldNames.forEach(fieldName => {
      if (!fieldName) return;
      const error = validate(fieldName, values[fieldName], values);
      if (error) errors[fieldName] = error;
    });
    return errors;
  };

  return { rules, validate, validateAll };
};
