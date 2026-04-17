import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, GraduationCap, Wallet, Bell, LogOut, Calendar, FileText, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const STORAGE_KEY = 'parent_portal_session';

interface ParentSession {
  studentId: string; // text student_id
  studentUuid: string;
  loggedInAt: string;
}

const ParentPortal = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const bn = language === 'bn';

  const [session, setSession] = useState<ParentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [dob, setDob] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !dob) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: bn ? 'ছাত্র আইডি ও জন্মতারিখ দিন