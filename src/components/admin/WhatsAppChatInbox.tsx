import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Search, RefreshCw, Loader2, User, Check,
  CheckCheck, Phone, Clock, ExternalLink, ShieldCheck, AlertCircle,
  Sparkles, MessageSquare, Plus, ArrowLeft, Paperclip, Image as ImageIcon,
  FileText, Download, X, Eye, Info, Users, UserCheck, ChevronRight,
  GraduationCap, Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatItem {
  id: string; // remoteJid, e.g. "8801832344072@s.whatsapp.net" or "120363...@g.us"
  remoteJid: string;
  name?: string;
  pushName?: string;
  profilePicUrl?: string;
  unreadCount?: number;
  lastMessageText?: string;
  lastMessageTime?: number;
  phone: string;
  isGroup: boolean;
}

interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  status?: string;
  senderName?: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'other';
  mediaUrl?: string;
  thumbnail?: string;
  fileName?: string;
}

interface MatchedIdentity {
  type: 'student' | 'staff';
  title: string;
  subtitle: string;
  photoUrl?: string;
  studentId?: string;
  rollNumber?: string;
  divisionName?: string;
  guardianName?: string;
  guardianPhone?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  recordId?: string;
}

interface WhatsAppChatInboxProps {
  canReply?: boolean;
}

export default function WhatsAppChatInbox({ canReply = true }: WhatsAppChatInboxProps) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // 1. Load Free Gateway settings
  const { data: gatewayConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['whatsapp_gateway_config_inbox'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'whatsapp_gateway_config')
        .maybeSingle();
      return (data?.value as any) || null;
    },
  });

  const serverUrl = (gatewayConfig?.server_url || '').replace(/\/+$/, '');
  const instance = (gatewayConfig?.instance_name || 'madrasa_main').trim();
  const apiKey = (gatewayConfig?.api_key || '').trim();
  const isEnabled = gatewayConfig?.is_enabled !== false && !!serverUrl;

  // 2. Load Student & Staff phone directory from Supabase
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['inbox_directory_students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, roll_number, student_id, phone, guardian_phone, father_name, father_phone, mother_name, mother_phone, address, photo_url, division_id, divisions(name, name_bn)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('roll_number', { ascending: true });
      if (error) {
        console.warn('Error loading students for WhatsApp directory:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['inbox_directory_staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, phone, photo_url, designation')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name_bn', { ascending: true });
      if (error) {
        console.warn('Error loading staff for WhatsApp directory:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Helper to format clean Bangladeshi / international phone number
  const formatPhoneNumber = (raw?: string) => {
    if (!raw) return '';
    const clean = raw.replace(/\D/g, '');
    const clean10 = clean.slice(-10);
    if (clean10.length === 10 && clean10.startsWith('1')) {
      return `+880 ${clean10.substring(0, 4)}-${clean10.substring(4)}`;
    }
    if (clean.length >= 7 && clean.length <= 15) {
      return `+${clean}`;
    }
    return raw;
  };

  // Helper to extract clean 10-digit local number
  const normalizeTo10Digits = (raw?: string): string => {
    if (!raw) return '';
    return raw.replace(/\D/g, '').slice(-10);
  };

  // Map: multi-keyed phone number -> MatchedIdentity object
  const directoryMap = useMemo(() => {
    const map = new Map<string, MatchedIdentity>();

    students.forEach((s: any) => {
      const divName = bn ? (s.divisions?.name_bn || s.divisions?.name) : (s.divisions?.name || s.divisions?.name_bn);
      const studentLabel = (bn ? s.name_bn : (s.name_en || s.name_bn)) || (bn ? 'শিক্ষার্থী' : 'Student');
      const sub = `${bn ? 'রোল:' : 'Roll:'} ${s.roll_number || '—'}${divName ? ` • ${divName}` : ''}`;

      const identityData: MatchedIdentity = {
        type: 'student',
        title: studentLabel,
        subtitle: sub,
        photoUrl: s.photo_url || undefined,
        studentId: s.student_id,
        rollNumber: s.roll_number,
        divisionName: divName,
        guardianPhone: s.guardian_phone,
        fatherName: s.father_name,
        motherName: s.mother_name,
        address: s.address,
        recordId: s.id,
      };

      const registerPhone = (rawPhone: string, roleTitle: string) => {
        if (!rawPhone) return;
        const clean10 = normalizeTo10Digits(rawPhone);
        if (clean10.length === 10) {
          const entry: MatchedIdentity = { ...identityData, title: `${studentLabel} (${roleTitle})` };
          map.set(clean10, entry);
          map.set(`0${clean10}`, entry);
          map.set(`880${clean10}`, entry);
          map.set(`880${clean10}@s.whatsapp.net`, entry);
        }
      };

      registerPhone(s.guardian_phone, bn ? 'অভিভাবক' : 'Guardian');
      registerPhone(s.father_phone, bn ? 'পিতা' : 'Father');
      registerPhone(s.mother_phone, bn ? 'মাতা' : 'Mother');
      registerPhone(s.phone, bn ? 'ছাত্র' : 'Student');
    });

    staffList.forEach((st: any) => {
      if (st.phone) {
        const clean10 = normalizeTo10Digits(st.phone);
        const name = (bn ? st.name_bn : (st.name_en || st.name_bn)) || (bn ? 'শিক্ষক' : 'Staff');
        if (clean10.length === 10) {
          const entry: MatchedIdentity = {
            type: 'staff',
            title: name,
            subtitle: st.designation || (bn ? 'স্টাফ/শিক্ষক' : 'Staff'),
            photoUrl: st.photo_url || undefined,
            recordId: st.id,
          };
          map.set(clean10, entry);
          map.set(`0${clean10}`, entry);
          map.set(`880${clean10}`, entry);
          map.set(`880${clean10}@s.whatsapp.net`, entry);
        }
      }
    });

    return map;
  }, [students, staffList, bn]);

  // Connection state
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [checkingOnline, setCheckingOnline] = useState(false);

  // Check connection status
  const checkConnection = async () => {
    if (!serverUrl) return;
    setCheckingOnline(true);
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['apikey'] = apiKey;
      const resp = await fetch(`${serverUrl}/instance/connectionState/${encodeURIComponent(instance)}`, { headers });
      const data = await resp.json().catch(() => ({}));
      const state = (data?.instance?.state || data?.state || '').toLowerCase();
      setGatewayOnline(state === 'open' || state === 'connected');
    } catch {
      setGatewayOnline(false);
    } finally {
      setCheckingOnline(false);
    }
  };

  useEffect(() => {
    if (serverUrl) checkConnection();
  }, [serverUrl, instance, apiKey]);

  // Chats list & active chat
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'students' | 'staff' | 'groups'>('all');

  // Profile sidebar drawer toggle
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  // Messages in active chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // File Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full image view lightbox
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  // New Chat modal
  const [newChatPhone, setNewChatPhone] = useState('');
  const [showNewChatInput, setShowNewChatInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to extract text from Evolution API message object
  const extractMessageText = (m: any): string => {
    if (!m) return '';
    if (typeof m === 'string') return m;
    const msg = m.message || m;
    if (typeof msg === 'string') return msg;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return `📷 ${msg.imageMessage.caption}`;
    if (msg.imageMessage) return '📷 [ছবি]';
    if (msg.documentMessage?.fileName) return `📄 ${msg.documentMessage.fileName}`;
    if (msg.audioMessage) return '🎵 [অডিও বার্তা]';
    if (msg.videoMessage) return '🎥 [ভিডিও বার্তা]';
    if (msg.reactionMessage?.text) return msg.reactionMessage.text;
    return m.text || '';
  };

  // Cached WhatsApp Address Book (from Evolution API findContacts)
  const contactsMapRef = useRef<Map<string, any>>(new Map());

  // Fetch Chats and Contacts concurrently from Evolution API
  const fetchChats = async (silent = false) => {
    if (!serverUrl || !isEnabled) return;
    if (!silent) setLoadingChats(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      let cMap = contactsMapRef.current;
      const fetchList: Promise<any>[] = [
        fetch(`${serverUrl}/chat/findChats/${encodeURIComponent(instance)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        }).then(r => r.ok ? r.json() : []).catch(() => []),
      ];

      // If contacts not yet cached, fetch address book simultaneously
      if (cMap.size === 0) {
        fetchList.push(
          fetch(`${serverUrl}/chat/findContacts/${encodeURIComponent(instance)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        );
      }

      const [rawChats, rawContacts] = await Promise.all(fetchList);

      if (rawContacts && Array.isArray(rawContacts) && rawContacts.length > 0) {
        const newMap = new Map<string, any>();
        rawContacts.forEach((c: any) => {
          if (c.remoteJid) {
            newMap.set(c.remoteJid, c);
            const digits = c.remoteJid.replace(/@.*$/, '');
            newMap.set(digits, c);
            if (digits.startsWith('880')) {
              newMap.set('0' + digits.substring(3), c);
              newMap.set(digits.substring(3), c);
            }
          }
        });
        contactsMapRef.current = newMap;
        cMap = newMap;
      }

      const chatList: any[] = Array.isArray(rawChats) ? rawChats : (rawChats?.chats || []);

      // Parse & normalize chats
      const parsed: ChatItem[] = chatList
        .filter((c: any) => {
          const jid = c.remoteJid || c.id || '';
          return jid && !jid.includes('status@broadcast') && jid !== '0@s.whatsapp.net';
        })
        .map((c: any) => {
          const jid = c.remoteJid || c.id || '';
          const isGroup = jid.endsWith('@g.us');
          const isLid = jid.endsWith('@lid');
          const digits = jid.replace(/@.*$/, '');
          const contact = cMap.get(jid) || cMap.get(digits);

          // Extract real phone number
          let rawPhone = '';
          if (isGroup) {
            rawPhone = '';
          } else if (isLid) {
            const altJid = c.lastMessage?.key?.remoteJidAlt || c.lastMessage?.key?.participantAlt;
            if (altJid && altJid.includes('@s.whatsapp.net')) {
              rawPhone = altJid.replace(/@.*$/, '');
            } else if (c.lastMessage) {
              const txt = extractMessageText(c.lastMessage);
              const m = txt.match(/(?:\+?88)?01[3-9]\d{8}\b/);
              if (m) rawPhone = m[0].replace(/\D/g, '');
            }
          } else {
            rawPhone = digits;
          }

          const formattedPhone = rawPhone ? formatPhoneNumber(rawPhone) : '';

          let displayName = '';
          if (isGroup) {
            displayName = c.pushName || c.name || contact?.pushName || (bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group');
          } else {
            const candidatePush =
              (contact?.pushName && contact.pushName !== jid && contact.pushName !== digits && contact.pushName !== 'Você') ? contact.pushName :
              (c.pushName && c.pushName !== jid && c.pushName !== digits && c.pushName !== 'Você') ? c.pushName :
              (c.name && c.name !== jid && c.name !== digits && c.name !== 'Você') ? c.name :
              (c.lastMessage?.pushName && c.lastMessage.pushName !== jid && c.lastMessage.pushName !== digits && c.lastMessage.pushName !== 'Você') ? c.lastMessage.pushName :
              '';

            if (candidatePush) {
              displayName = candidatePush;
            } else if (formattedPhone) {
              displayName = formattedPhone;
            } else if (isLid) {
              displayName = bn ? `হোয়াটসঅ্যাপ (#${digits.slice(-4)})` : `WhatsApp (#${digits.slice(-4)})`;
            } else {
              displayName = bn ? 'হোয়াটসঅ্যাপ যোগাযোগ' : 'WhatsApp Contact';
            }
          }

          const resolvedPic = c.profilePicUrl || contact?.profilePicUrl || undefined;
          const lastMsg = c.lastMessage || {};
          const ts = lastMsg.messageTimestamp ? Number(lastMsg.messageTimestamp) * 1000 : Date.now();
          const text = extractMessageText(lastMsg);

          return {
            id: jid,
            remoteJid: jid,
            name: displayName,
            pushName: displayName,
            profilePicUrl: resolvedPic,
            unreadCount: c.unreadCount || 0,
            lastMessageText: text,
            lastMessageTime: ts,
            phone: rawPhone,
            isGroup,
          };
        })
        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

      setChats(parsed);
      setGatewayOnline(true);
    } catch (err: any) {
      console.warn('Error fetching chats from Evolution API:', err);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (serverUrl && isEnabled) {
      fetchChats();
    }
  }, [serverUrl, instance, apiKey, isEnabled]);

  // Periodic poll for chats and active messages (every 5 seconds)
  useEffect(() => {
    if (!serverUrl || !isEnabled || gatewayOnline === false) return;
    const timer = setInterval(() => {
      fetchChats(true);
      if (selectedChat) {
        fetchMessages(selectedChat.remoteJid, true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [serverUrl, instance, apiKey, isEnabled, gatewayOnline, selectedChat?.remoteJid]);

  // Fetch messages for a specific chat using remoteJid
  const fetchMessages = async (remoteJid: string, silent = false) => {
    if (!serverUrl) return;
    if (!silent) setLoadingMessages(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      let msgList: any[] = [];

      // Evolution API v2: query { where: { key: { remoteJid } }, limit: 100 }
      const resp = await fetch(`${serverUrl}/chat/findMessages/${encodeURIComponent(instance)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          where: { key: { remoteJid } },
          limit: 100,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const records = Array.isArray(data) ? data : data?.messages?.records || data?.records || [];
        // Strict client-side filter to ensure ONLY messages belonging to this remoteJid are included!
        msgList = records.filter((m: any) => {
          const mJid = m.key?.remoteJid || m.remoteJid;
          return mJid === remoteJid;
        });
      }

      const parsed: ChatMessage[] = msgList.map((m: any) => {
        const text = extractMessageText(m);
        const ts = m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : (m.timestamp ? Number(m.timestamp) * 1000 : Date.now());
        const fromMe = m.key ? !!m.key.fromMe : !!m.fromMe;
        const msgId = m.key?.id || m.id || String(Math.random());

        // Parse media
        let type: ChatMessage['type'] = 'text';
        let mediaUrl: string | undefined = undefined;
        let thumbnail: string | undefined = undefined;
        let fileName: string | undefined = undefined;

        const imgMsg = m.message?.imageMessage;
        const docMsg = m.message?.documentMessage;
        const audMsg = m.message?.audioMessage;

        if (imgMsg) {
          type = 'image';
          thumbnail = imgMsg.jpegThumbnail ? (imgMsg.jpegThumbnail.startsWith('data:') ? imgMsg.jpegThumbnail : `data:image/jpeg;base64,${imgMsg.jpegThumbnail}`) : undefined;
          mediaUrl = imgMsg.url || thumbnail;
        } else if (docMsg) {
          type = 'document';
          fileName = docMsg.fileName || 'document.pdf';
          mediaUrl = docMsg.url;
        } else if (audMsg) {
          type = 'audio';
        }

        return {
          id: msgId,
          fromMe,
          text,
          timestamp: ts,
          status: m.status || 'SENT',
          senderName: m.pushName || (m.key?.participantAlt ? m.key.participantAlt.replace(/@.*$/, '') : ''),
          type,
          mediaUrl,
          thumbnail,
          fileName,
        };
      }).sort((a, b) => a.timestamp - b.timestamp);

      setMessages(parsed);
      if (!silent) setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.warn('Error fetching messages from Evolution API:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    setSelectedChat(chat);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setMessages([]);
    fetchMessages(chat.remoteJid);
  };

  // Map 10-digit phone to existing active chat for fast lookup
  const chatByPhone10 = useMemo(() => {
    const map = new Map<string, ChatItem>();
    chats.forEach(c => {
      if (c.phone && !c.isGroup) {
        const clean10 = normalizeTo10Digits(c.phone);
        if (clean10.length === 10) {
          map.set(clean10, c);
        }
      }
    });
    return map;
  }, [chats]);

  // One-click select / start chat with a Madrasa student
  const handleSelectStudent = (student: any) => {
    const primaryPhone = student.guardian_phone || student.father_phone || student.phone || student.mother_phone || '';
    const clean10 = normalizeTo10Digits(primaryPhone);

    if (clean10.length !== 10) {
      toast.error(bn ? 'এই শিক্ষার্থীর কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি' : 'No valid mobile number for this student');
      return;
    }

    const fullPhone = `880${clean10}`;
    const jid = `${fullPhone}@s.whatsapp.net`;

    const existingChat = chats.find(c => c.remoteJid === jid || (c.phone && normalizeTo10Digits(c.phone) === clean10));
    const studentLabel = (bn ? student.name_bn : (student.name_en || student.name_bn)) || (bn ? 'শিক্ষার্থী' : 'Student');

    const targetChat: ChatItem = existingChat ? {
      ...existingChat,
      phone: fullPhone,
      name: `${studentLabel} (${bn ? 'অভিভাবক' : 'Guardian'})`,
      pushName: studentLabel,
      profilePicUrl: student.photo_url || existingChat.profilePicUrl,
    } : {
      id: jid,
      remoteJid: jid,
      phone: fullPhone,
      name: `${studentLabel} (${bn ? 'অভিভাবক' : 'Guardian'})`,
      pushName: studentLabel,
      profilePicUrl: student.photo_url || undefined,
      unreadCount: 0,
      lastMessageText: '',
      lastMessageTime: undefined,
      isGroup: false,
    };

    handleSelectChat(targetChat);
  };

  // One-click select / start chat with Madrasa staff / teacher
  const handleSelectStaff = (st: any) => {
    const clean10 = normalizeTo10Digits(st.phone);

    if (clean10.length !== 10) {
      toast.error(bn ? 'এই শিক্ষকের কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি' : 'No valid mobile number for this staff');
      return;
    }

    const fullPhone = `880${clean10}`;
    const jid = `${fullPhone}@s.whatsapp.net`;

    const existingChat = chats.find(c => c.remoteJid === jid || (c.phone && normalizeTo10Digits(c.phone) === clean10));
    const staffName = (bn ? st.name_bn : (st.name_en || st.name_bn)) || (bn ? 'শিক্ষক' : 'Staff');

    const targetChat: ChatItem = existingChat ? {
      ...existingChat,
      phone: fullPhone,
      name: staffName,
      pushName: staffName,
      profilePicUrl: st.photo_url || existingChat.profilePicUrl,
    } : {
      id: jid,
      remoteJid: jid,
      phone: fullPhone,
      name: staffName,
      pushName: staffName,
      profilePicUrl: st.photo_url || undefined,
      unreadCount: 0,
      lastMessageText: '',
      lastMessageTime: undefined,
      isGroup: false,
    };

    handleSelectChat(targetChat);
  };

  // Handle file selection from paperclip
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error(bn ? 'ফাইলের আকার ২৫ MB এর বেশি হতে পারবে না' : 'File size cannot exceed 25MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Reply Message (Text or Media attachment)
  const handleSendReply = async () => {
    if ((!replyText.trim() && !selectedFile) || !selectedChat || !serverUrl) return;
    if (!canReply) {
      toast.error(bn ? 'আপনার মেসেজ পাঠানোর অনুমতি নেই' : 'You do not have permission to reply');
      return;
    }

    const textToSend = replyText.trim();
    setSending(true);

    try {
      const recipientNumber = selectedChat.remoteJid;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      if (selectedFile) {
        // Send Media Attachment
        const isImg = selectedFile.type.startsWith('image/');
        const mediaType = isImg ? 'image' : 'document';

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const resp = await fetch(`${serverUrl}/message/sendMedia/${encodeURIComponent(instance)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: recipientNumber,
            mediatype: mediaType,
            mimetype: selectedFile.type || (isImg ? 'image/jpeg' : 'application/pdf'),
            caption: textToSend || undefined,
            media: base64Data,
            fileName: selectedFile.name,
            delay: 500,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || (bn ? 'ফাইল পাঠানো সম্ভব হয়নি' : 'Failed to send file'));
        }

        const newMsg: ChatMessage = {
          id: `opt-${Date.now()}`,
          fromMe: true,
          text: textToSend,
          timestamp: Date.now(),
          status: 'PENDING',
          type: mediaType,
          thumbnail: isImg ? base64Data : undefined,
          fileName: selectedFile.name,
        };

        setMessages(prev => [...prev, newMsg]);
        clearAttachment();
        setReplyText('');
        setTimeout(scrollToBottom, 50);
        toast.success(bn ? 'ফাইল পাঠানো হয়েছে' : 'File sent');
      } else {
        // Send Simple Text
        const resp = await fetch(`${serverUrl}/message/sendText/${encodeURIComponent(instance)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: recipientNumber,
            text: textToSend,
            delay: 500,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || (bn ? 'মেসেজ পাঠানো সম্ভব হয়নি' : 'Failed to send message'));
        }

        const newMsg: ChatMessage = {
          id: `opt-${Date.now()}`,
          fromMe: true,
          text: textToSend,
          timestamp: Date.now(),
          status: 'PENDING',
          type: 'text',
        };

        setMessages(prev => [...prev, newMsg]);
        setReplyText('');
        setTimeout(scrollToBottom, 50);
        toast.success(bn ? 'মেসেজ পাঠানো হয়েছে' : 'Message sent');
      }

      // Refresh messages after 1.5s
      setTimeout(() => fetchMessages(selectedChat.remoteJid, true), 1500);
    } catch (err: any) {
      toast.error(err.message || (bn ? 'মেসেজ পাঠানো ব্যর্থ' : 'Failed to send reply'));
    } finally {
      setSending(false);
    }
  };

  // Start new chat with custom phone
  const handleStartNewChat = () => {
    const raw = newChatPhone.trim().replace(/\D/g, '');
    const clean10 = raw.slice(-10);
    if (!clean10 || clean10.length !== 10) {
      toast.error(bn ? 'সঠিক ১১ বা ১০ ডিজিট ফোন নম্বর দিন (যেমন: 017XXXXXXXX)' : 'Enter a valid phone number');
      return;
    }
    const fullPhone = `880${clean10}`;
    const jid = `${fullPhone}@s.whatsapp.net`;

    const identity = directoryMap.get(clean10);
    const newChat: ChatItem = {
      id: jid,
      remoteJid: jid,
      phone: fullPhone,
      name: identity?.title || formatPhoneNumber(fullPhone),
      pushName: identity?.title || formatPhoneNumber(fullPhone),
      profilePicUrl: identity?.photoUrl,
      lastMessageText: '',
      lastMessageTime: Date.now(),
      isGroup: false,
    };

    setSelectedChat(newChat);
    setMessages([]);
    setShowNewChatInput(false);
    setNewChatPhone('');
  };

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s: any) => {
      const nameBn = (s.name_bn || '').toLowerCase();
      const nameEn = (s.name_en || '').toLowerCase();
      const roll = String(s.roll_number || '');
      const sid = String(s.student_id || '').toLowerCase();
      const phone = String(s.phone || '');
      const gPhone = String(s.guardian_phone || '');
      const fPhone = String(s.father_phone || '');
      const fName = (s.father_name || '').toLowerCase();
      const divName = (s.divisions?.name_bn || s.divisions?.name || '').toLowerCase();

      return (
        nameBn.includes(q) ||
        nameEn.includes(q) ||
        roll.includes(q) ||
        sid.includes(q) ||
        phone.includes(q) ||
        gPhone.includes(q) ||
        fPhone.includes(q) ||
        fName.includes(q) ||
        divName.includes(q)
      );
    });
  }, [students, searchQuery]);

  // Filter staff by search
  const filteredStaff = useMemo(() => {
    if (!staffList || staffList.length === 0) return [];
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter((st: any) => {
      const nameBn = (st.name_bn || '').toLowerCase();
      const nameEn = (st.name_en || '').toLowerCase();
      const phone = String(st.phone || '');
      const desig = (st.designation || '').toLowerCase();
      return nameBn.includes(q) || nameEn.includes(q) || phone.includes(q) || desig.includes(q);
    });
  }, [staffList, searchQuery]);

  // Filter WhatsApp chats
  const filteredChats = useMemo(() => {
    let list = chats;
    if (activeFilter === 'groups') {
      list = list.filter(c => c.isGroup);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => {
      const matchPhone = c.phone.includes(q);
      const matchName = (c.name || '').toLowerCase().includes(q) || (c.pushName || '').toLowerCase().includes(q);
      const clean10 = normalizeTo10Digits(c.phone);
      const identity = clean10 ? directoryMap.get(clean10) : null;
      const matchIdentity = identity?.title.toLowerCase().includes(q) || identity?.subtitle.toLowerCase().includes(q) || (identity?.rollNumber || '').includes(q);
      return matchPhone || matchName || matchIdentity;
    });
  }, [chats, searchQuery, activeFilter, directoryMap]);

  // Tab badge counts
  const tabCounts = useMemo(() => ({
    all: chats.length,
    students: students.length,
    staff: staffList.length,
    groups: chats.filter(c => c.isGroup).length,
  }), [chats, students, staffList]);

  // Active selected recipient information
  const currentRecipient = useMemo(() => {
    if (!selectedChat) return null;
    const clean10 = normalizeTo10Digits(selectedChat.phone);
    const identity = (clean10 ? directoryMap.get(clean10) : null) || directoryMap.get(selectedChat.remoteJid) || null;
    const isGrp = selectedChat.isGroup;

    let headerName = selectedChat.name || selectedChat.pushName || '';
    if (isGrp) {
      headerName = selectedChat.pushName || selectedChat.name || (bn ? 'গ্রুপ চ্যাট' : 'Group Chat');
    } else if (identity) {
      headerName = identity.title;
    } else if (!headerName && selectedChat.phone) {
      headerName = formatPhoneNumber(selectedChat.phone);
    }

    const photoSrc = selectedChat.profilePicUrl || identity?.photoUrl;

    return {
      identity,
      headerName,
      isGrp,
      photoSrc,
      phone: selectedChat.phone,
      formattedPhone: formatPhoneNumber(selectedChat.phone),
    };
  }, [selectedChat, directoryMap, bn]);

  // Canned quick replies
  const quickReplies = [
    bn ? 'আসসালামু আলাইকুম, আপনার বার্তাটি পেয়েছি।' : 'Assalamu Alaikum, received your message.',
    bn ? 'ফি ও বকেয়া সম্পর্কিত বিস্তারিত জানতে মাদ্রাসার অফিসে যোগাযোগ করুন।' : 'Please contact the office for fee inquiries.',
    bn ? 'ইনশাআল্লাহ আমরা বিষয়টি দ্রুত দেখে ব্যবস্থা নিচ্ছি।' : 'We are looking into this shortly.',
    bn ? 'জাযাকাল্লাহু খাইরান।' : 'JazakAllahu Khair.',
  ];

  // Formatting helper
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString(bn ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(bn ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' });
  };

  if (loadingConfig) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs">{bn ? 'WhatsApp ইনবক্স লোড হচ্ছে...' : 'Loading WhatsApp Inbox...'}</p>
      </div>
    );
  }

  // Gateway offline notice
  if (!isEnabled || gatewayOnline === false) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-bold text-base text-foreground">
              {bn ? 'ফ্রি WhatsApp গেটওয়ে বর্তমানে অফলাইন বা সংযোগহীন' : 'WhatsApp Gateway is Offline'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {bn
                ? 'অভিভাবকদের ইনকামিং মেসেজ দেখতে ও লাইভ চ্যাট করতে প্রথমে WhatsApp গেটওয়েটি কিউআর কোড স্ক্যান করে কানেক্ট করুন।'
                : 'Connect your WhatsApp Gateway to view incoming messages and chat with guardians.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={checkingOnline}
              className="gap-2 text-xs rounded-full"
            >
              {checkingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {bn ? 'সংযোগ পুনঃযাচাই' : 'Re-check Status'}
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs rounded-full"
            >
              <Link to="/admin/settings?tab=whatsapp">
                <ExternalLink className="w-3.5 h-3.5" />
                {bn ? 'WhatsApp সেটিংস ও QR কোড' : 'WhatsApp Settings & QR'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border bg-background shadow-xs overflow-hidden flex flex-col h-[750px] relative">
      {/* Top Banner / Toolbar */}
      <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{bn ? 'WhatsApp লাইভ চ্যাট ও ইনবক্স' : 'WhatsApp Live Chat & Inbox'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                {bn ? 'লাইভ সংযুক্ত' : 'Live Connected'}
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {bn ? 'মাদ্রাসার শিক্ষার্থী, অভিভাবক ও শিক্ষকদের সাথে সরাসরি নিরাপদ চ্যাট' : 'Direct live chat with verified students, guardians and staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!canReply && (
            <Badge variant="secondary" className="text-[10px] text-amber-700 bg-amber-500/15 border-amber-500/30">
              {bn ? 'শুধুমাত্র দেখার অনুমতি' : 'View Only Role'}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchChats()}
            disabled={loadingChats}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            {loadingChats ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{bn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNewChatInput(prev => !prev)}
            className="h-8 gap-1.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{bn ? 'নম্বর লিখুন' : 'Enter Number'}</span>
          </Button>
        </div>
      </div>

      {/* New Chat Custom Phone Bar */}
      {showNewChatInput && (
        <div className="p-3 bg-emerald-500/10 border-b flex items-center gap-2 animate-in fade-in shrink-0">
          <Input
            placeholder={bn ? 'মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX বা 88017XXXXXXXX)' : 'Enter phone number'}
            value={newChatPhone}
            onChange={e => setNewChatPhone(e.target.value)}
            className="h-9 text-xs bg-background max-w-sm"
          />
          <Button size="sm" onClick={handleStartNewChat} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
            {bn ? 'চ্যাট শুরু করুন' : 'Start Chat'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewChatInput(false)} className="h-9 text-xs rounded-xl">
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
        </div>
      )}

      {/* Main Inbox Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Sidebar */}
        <div className={`w-full sm:w-80 md:w-96 border-r flex flex-col bg-muted/20 shrink-0 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
          {/* Search Box */}
          <div className="p-2.5 border-b bg-background space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder={
                  activeFilter === 'students'
                    ? (bn ? 'ছাত্রের নাম, রোল, বিভাগ বা ফোন নম্বর...' : 'Search student name, roll, phone...')
                    : activeFilter === 'staff'
                    ? (bn ? 'শিক্ষকের নাম, পদবী বা ফোন নম্বর...' : 'Search staff name or phone...')
                    : (bn ? 'নাম, রোল বা মোবাইল দিয়ে খুঁজুন...' : 'Search name, roll, phone...')
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/50 rounded-xl"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-0.5 scrollbar-none">
              {[
                { key: 'all', label: bn ? 'সকল চ্যাট' : 'All', count: tabCounts.all },
                { key: 'students', label: bn ? 'ছাত্র ও অভিভাবক' : 'Students', count: tabCounts.students },
                { key: 'staff', label: bn ? 'শিক্ষক ও স্টাফ' : 'Staff', count: tabCounts.staff },
                { key: 'groups', label: bn ? 'গ্রুপ' : 'Groups', count: tabCounts.groups },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key as any)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium flex items-center gap-1.5 ${
                    activeFilter === f.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Students Directory Tab */}
          {activeFilter === 'students' && (
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {loadingStudents && students.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs">{bn ? 'মাদ্রাসার শিক্ষার্থী তালিকা লোড হচ্ছে...' : 'Loading students...'}</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground px-4 space-y-1">
                  <GraduationCap className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">{bn ? 'কোনো শিক্ষার্থী পাওয়া যায়নি' : 'No students found'}</p>
                  <p>{bn ? 'শিক্ষার্থীর নাম, রোল বা ফোন নম্বর দিয়ে অনুসন্ধান করুন।' : 'Search by name, roll, or phone.'}</p>
                </div>
              ) : (
                filteredStudents.map((s: any) => {
                  const studentName = (bn ? s.name_bn : (s.name_en || s.name_bn)) || (bn ? 'শিক্ষার্থী' : 'Student');
                  const primaryPhone = s.guardian_phone || s.father_phone || s.phone || s.mother_phone || '';
                  const clean10 = normalizeTo10Digits(primaryPhone);
                  const existingChat = clean10 ? chatByPhone10.get(clean10) : null;
                  const divName = bn ? (s.divisions?.name_bn || s.divisions?.name) : (s.divisions?.name || s.divisions?.name_bn);
                  const isSelected = selectedChat && !selectedChat.isGroup && normalizeTo10Digits(selectedChat.phone) === clean10;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/60 ${
                        isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={studentName}
                            className="w-10 h-10 rounded-full object-cover border border-border/60 shadow-xs"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {studentName.charAt(0) || '🎓'}
                          </div>
                        )}
                        {existingChat?.unreadCount ? (
                          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                            {existingChat.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {studentName}
                          </p>
                          {existingChat?.lastMessageTime ? (
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {formatTime(existingChat.lastMessageTime)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                              {bn ? 'চ্যাট করুন' : 'Chat'}
                            </Badge>
                          )}
                        </div>

                        {/* Phone + Roll / Division */}
                        <div className="flex items-center gap-1.5 text-[11px] mb-0.5 flex-wrap">
                          {primaryPhone ? (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {formatPhoneNumber(primaryPhone)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">{bn ? 'ফোন নম্বর নেই' : 'No phone'}</span>
                          )}

                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-blue-500/10 text-blue-700 border-blue-500/30 shrink-0">
                            {bn ? `রোল: ${s.roll_number || '—'}` : `Roll: ${s.roll_number || '—'}`}
                            {divName ? ` • ${divName}` : ''}
                          </Badge>
                        </div>

                        {/* Guardian / Father or Last message */}
                        <p className="text-[11px] text-muted-foreground truncate">
                          {existingChat?.lastMessageText ? (
                            existingChat.lastMessageText
                          ) : s.father_name ? (
                            `${bn ? 'অভিভাবক:' : 'Guardian:'} ${s.father_name}`
                          ) : (
                            bn ? 'হোয়াটসঅ্যাপ বার্তা পাঠাতে ক্লিক করুন' : 'Click to send message'
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Staff Directory Tab */}
          {activeFilter === 'staff' && (
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {loadingStaff && staffList.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs">{bn ? 'মাদ্রাসার শিক্ষক ও স্টাফ তালিকা লোড হচ্ছে...' : 'Loading staff...'}</p>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground px-4 space-y-1">
                  <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">{bn ? 'কোনো শিক্ষক বা স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
                  <p>{bn ? 'শিক্ষক বা স্টাফের নাম ও মোবাইল দিয়ে খুঁজুন।' : 'Search by name or phone.'}</p>
                </div>
              ) : (
                filteredStaff.map((st: any) => {
                  const staffName = (bn ? st.name_bn : (st.name_en || st.name_bn)) || (bn ? 'শিক্ষক' : 'Staff');
                  const clean10 = normalizeTo10Digits(st.phone);
                  const existingChat = clean10 ? chatByPhone10.get(clean10) : null;
                  const isSelected = selectedChat && !selectedChat.isGroup && normalizeTo10Digits(selectedChat.phone) === clean10;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStaff(st)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/60 ${
                        isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {st.photo_url ? (
                          <img
                            src={st.photo_url}
                            alt={staffName}
                            className="w-10 h-10 rounded-full object-cover border border-border/60 shadow-xs"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                            {staffName.charAt(0) || '💼'}
                          </div>
                        )}
                        {existingChat?.unreadCount ? (
                          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                            {existingChat.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {staffName}
                          </p>
                          {existingChat?.lastMessageTime ? (
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {formatTime(existingChat.lastMessageTime)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                              {bn ? 'চ্যাট করুন' : 'Chat'}
                            </Badge>
                          )}
                        </div>

                        {/* Phone + Designation */}
                        <div className="flex items-center gap-1.5 text-[11px] mb-0.5 flex-wrap">
                          {st.phone ? (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {formatPhoneNumber(st.phone)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">{bn ? 'ফোন নম্বর নেই' : 'No phone'}</span>
                          )}

                          {st.designation && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/30 shrink-0">
                              {st.designation}
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">
                          {existingChat?.lastMessageText || (bn ? 'বার্তা পাঠাতে ক্লিক করুন' : 'Click to send message')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* 3. WhatsApp All Chats & Groups Tab */}
          {(activeFilter === 'all' || activeFilter === 'groups') && (
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {loadingChats && chats.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs">{bn ? 'চ্যাট তালিকা আসছে...' : 'Loading chats...'}</p>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground px-4 space-y-1">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">{bn ? 'কোনো চ্যাট পাওয়া যায়নি' : 'No chats found'}</p>
                  <p>{bn ? 'ছাত্র ও অভিভাবক ট্যাব থেকে সরাসরি শিক্ষার্থী নির্বাচন করে মেসেজ পাঠান।' : 'Select a student to start chatting.'}</p>
                </div>
              ) : (
                filteredChats.map(c => {
                  const isSelected = selectedChat?.remoteJid === c.remoteJid;
                  const cleanLast10 = normalizeTo10Digits(c.phone);
                  const identity = cleanLast10 ? directoryMap.get(cleanLast10) : null;

                  let displayName = c.name || c.pushName || '';
                  if (c.isGroup) {
                    displayName = c.pushName || c.name || (bn ? 'গ্রুপ চ্যাট' : 'Group Chat');
                  } else if (identity) {
                    displayName = identity.title;
                  } else if (!displayName && c.phone) {
                    displayName = formatPhoneNumber(c.phone);
                  }

                  const photoSrc = c.profilePicUrl || identity?.photoUrl;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectChat(c)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/60 ${
                        isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover border border-border/60 shadow-xs"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            c.isGroup ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300' :
                            identity?.type === 'student' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' :
                            identity?.type === 'staff' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {c.isGroup ? <Users className="w-4 h-4" /> : displayName.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                        )}

                        {c.unreadCount ? (
                          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      {/* Chat Text Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                            {c.isGroup && <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                            <span className="truncate">{displayName}</span>
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                            {formatTime(c.lastMessageTime)}
                          </span>
                        </div>

                        {/* Phone number & Badges */}
                        <div className="flex items-center gap-1.5 text-[11px] mb-0.5 flex-wrap">
                          {!c.isGroup && c.phone && (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {formatPhoneNumber(c.phone)}
                            </span>
                          )}

                          {identity && (
                            <Badge variant="outline" className={`text-[9px] py-0 px-1.5 shrink-0 ${
                              identity.type === 'student'
                                ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            }`}>
                              {identity.subtitle}
                            </Badge>
                          )}

                          {!identity && !c.isGroup && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted text-muted-foreground border-border shrink-0">
                              {bn ? 'ব্যক্তিগত' : 'Direct'}
                            </Badge>
                          )}

                          {c.isGroup && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-purple-500/10 text-purple-700 border-purple-500/30 shrink-0">
                              {bn ? 'গ্রুপ' : 'Group'}
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.lastMessageText || (c.isGroup ? (bn ? 'কোনো বার্তা নেই' : 'No messages') : '—')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Center Area: Chat Window */}
        <div className={`flex-1 min-w-0 flex flex-col bg-background overflow-hidden ${selectedChat ? 'flex' : 'hidden sm:flex'}`}>
          {selectedChat && currentRecipient ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-3 shrink-0 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChat(null)}
                    className="sm:hidden p-1.5 h-8 w-8 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  {currentRecipient.photoSrc ? (
                    <img
                      src={currentRecipient.photoSrc}
                      alt={currentRecipient.headerName}
                      onClick={() => setPreviewImageSrc(currentRecipient.photoSrc || null)}
                      className="w-10 h-10 rounded-full object-cover border border-border/80 cursor-pointer shadow-xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      currentRecipient.isGrp ? 'bg-purple-500/15 text-purple-700' :
                      currentRecipient.identity?.type === 'student' ? 'bg-blue-500/15 text-blue-700' :
                      currentRecipient.identity?.type === 'staff' ? 'bg-amber-500/15 text-amber-700' :
                      'bg-emerald-500/15 text-emerald-700'
                    }`}>
                      {currentRecipient.isGrp ? <Users className="w-4 h-4" /> : currentRecipient.headerName.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2 truncate">
                      <span className="truncate">{currentRecipient.headerName}</span>
                      {currentRecipient.identity?.type === 'student' && (
                        <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-500/10 border-blue-500/30 shrink-0">
                          🎓 {bn ? 'শিক্ষার্থীর অভিভাবক' : 'Guardian'}
                        </Badge>
                      )}
                      {currentRecipient.identity?.type === 'staff' && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-500/10 border-amber-500/30 shrink-0">
                          💼 {bn ? 'শিক্ষক/স্টাফ' : 'Staff'}
                        </Badge>
                      )}
                      {currentRecipient.isGrp && (
                        <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-500/10 border-purple-500/30 shrink-0">
                          👥 {bn ? 'গ্রুপ' : 'Group'}
                        </Badge>
                      )}
                      {!currentRecipient.identity && !currentRecipient.isGrp && (
                        <Badge variant="outline" className="text-[10px] text-amber-800 bg-amber-500/10 border-amber-500/30 shrink-0">
                          ⚠️ {bn ? 'বহিরাগত' : 'External'}
                        </Badge>
                      )}
                    </h4>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 truncate mt-0.5">
                      {!currentRecipient.isGrp ? (
                        <>
                          {currentRecipient.formattedPhone && (
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {currentRecipient.formattedPhone}
                            </span>
                          )}
                          {currentRecipient.identity?.subtitle && (
                            <span className="text-foreground font-medium truncate">
                              • {currentRecipient.identity.subtitle}
                            </span>
                          )}
                          {currentRecipient.identity?.fatherName && (
                            <span className="text-muted-foreground truncate hidden lg:inline">
                              • {bn ? 'পিতা:' : 'Father:'} {currentRecipient.identity.fatherName}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-purple-700 font-medium">{bn ? 'সদস্যদের গ্রুপ বার্তা' : 'Group conversation'}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant={showProfilePanel ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowProfilePanel(prev => !prev)}
                    className="h-8 gap-1.5 text-xs rounded-xl"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline">{bn ? 'প্রোফাইল' : 'Profile'}</span>
                  </Button>

                  {!currentRecipient.isGrp && selectedChat.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 gap-1.5 text-xs rounded-xl"
                    >
                      <a
                        href={`https://web.whatsapp.com/send?phone=${selectedChat.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">{bn ? 'WhatsApp Web' : 'Web'}</span>
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchMessages(selectedChat.remoteJid)}
                    disabled={loadingMessages}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-muted/10">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <p className="text-xs">{bn ? 'চ্যাট হিস্ট্রি লোড হচ্ছে...' : 'Loading chat history...'}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground max-w-sm mx-auto space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-foreground">
                      {bn ? 'কোনো পূর্ববর্তী বার্তা পাওয়া যায়নি' : 'No previous messages'}
                    </p>
                    <p className="leading-relaxed">
                      {selectedChat.phone ? (
                        bn ? (
                          <>
                            এই নম্বরে (<span className="font-mono font-bold text-emerald-600">{formatPhoneNumber(selectedChat.phone)}</span>) এখনো কোনো চ্যাট হিস্ট্রি নেই। নিচের বক্সে লিখে সরাসরি WhatsApp বার্তা পাঠান।
                          </>
                        ) : (
                          `No message history with ${formatPhoneNumber(selectedChat.phone)}. Send a message below to start chatting.`
                        )
                      ) : (
                        bn ? 'নিচের ইনপুট থেকে বার্তা পাঠিয়ে সরাসরি কথোপকথন শুরু করুন।' : 'Send a message below to start chatting.'
                      )}
                    </p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.fromMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                          m.fromMe
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-card border text-foreground rounded-bl-xs'
                        }`}
                      >
                        {!m.fromMe && m.senderName && selectedChat.isGroup && (
                          <p className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                            ~ {m.senderName}
                          </p>
                        )}

                        {/* Image Message */}
                        {m.type === 'image' && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-black/10 bg-black/5">
                            {m.thumbnail ? (
                              <img
                                src={m.thumbnail}
                                alt="Image"
                                onClick={() => setPreviewImageSrc(m.mediaUrl || m.thumbnail || null)}
                                className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              />
                            ) : (
                              <div className="p-4 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-emerald-500" />
                                <span>{bn ? 'ছবি বার্তা' : 'Photo'}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Document Message */}
                        {m.type === 'document' && (
                          <div className="mb-2 p-2.5 rounded-xl bg-muted/60 dark:bg-muted/30 border flex items-center justify-between gap-3 text-foreground">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-5 h-5 text-primary shrink-0" />
                              <span className="font-semibold text-xs truncate">{m.fileName || 'Document'}</span>
                            </div>
                            {m.mediaUrl && (
                              <Button size="sm" variant="ghost" asChild className="h-7 w-7 p-0 shrink-0">
                                <a href={m.mediaUrl} target="_blank" rel="noreferrer" download={m.fileName}>
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            )}
                          </div>
                        )}

                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}

                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            m.fromMe ? 'text-emerald-100/80' : 'text-muted-foreground'
                          }`}
                        >
                          <span>{formatTime(m.timestamp)}</span>
                          {m.fromMe && (
                            <span>
                              {m.status === 'READ' ? (
                                <CheckCheck className="w-3 h-3 text-cyan-200" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              {canReply && (
                <div className="px-3 py-1.5 bg-background border-t flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 min-w-0 scrollbar-none">
                  <span className="text-muted-foreground shrink-0 flex items-center gap-1 text-[10px]">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {bn ? 'কুইক রিপ্লাই:' : 'Quick:'}
                  </span>
                  {quickReplies.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(q)}
                      className="px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground border border-border/40 whitespace-nowrap text-[11px] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Attachment Preview Bar */}
              {selectedFile && (
                <div className="p-2.5 px-4 bg-muted/80 border-t flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={clearAttachment} className="h-7 w-7 p-0 rounded-full">
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}

              {/* SAFETY RECIPIENT VERIFICATION BANNER */}
              <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t-2 border-emerald-500/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 shrink-0">
                    {bn ? 'বার্তা প্রাপক:' : 'Sending to:'}
                  </span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">
                    {currentRecipient.headerName}
                  </span>
                  {selectedChat.phone && (
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0 flex items-center gap-1 bg-emerald-500/15 px-2.5 py-0.5 rounded-full text-xs">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {formatPhoneNumber(selectedChat.phone)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentRecipient.identity ? (
                    <Badge className={`text-[10px] py-0.5 px-2 font-medium ${
                      currentRecipient.identity.type === 'student'
                        ? 'bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30'
                    }`}>
                      {currentRecipient.identity.type === 'student' ? '🎓 ' : '💼 '}
                      {currentRecipient.identity.subtitle}
                    </Badge>
                  ) : currentRecipient.isGrp ? (
                    <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-700 border-purple-500/30">
                      👥 {bn ? 'গ্রুপ বার্তা' : 'Group Message'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30">
                      ⚠️ {bn ? 'বহিরাগত নম্বর' : 'External Contact'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-background border-t shrink-0 min-w-0">
                {canReply ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="flex items-end gap-2 w-full min-w-0"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-[42px] w-[42px] p-0 rounded-xl shrink-0 border-border/70 hover:bg-muted"
                      title={bn ? 'ফাইল বা ছবি এটাচ করুন' : 'Attach file or image'}
                    >
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                    </Button>

                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder={selectedFile ? (bn ? 'ক্যাপশন লিখুন (ঐচ্ছিক)...' : 'Add caption...') : (bn ? 'মেসেজ লিখুন... (Enter চাপলে পাঠানো হবে)' : 'Type a reply...')}
                      className="min-h-[42px] max-h-24 resize-none text-xs rounded-xl flex-1 min-w-0"
                      rows={1}
                    />

                    <Button
                      type="submit"
                      disabled={sending || (!replyText.trim() && !selectedFile)}
                      className="h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="hidden sm:inline">{bn ? 'পাঠান' : 'Send'}</span>
                    </Button>
                  </form>
                ) : (
                  <div className="p-2.5 rounded-xl bg-muted text-center text-xs text-muted-foreground">
                    {bn
                      ? '🔒 আপনার রোলে মেসেজ পাঠানোর অনুমতি নেই (শুধুমাত্র দেখার অনুমতি আছে)।'
                      : '🔒 Your role only has view permission for WhatsApp inbox.'}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-base text-foreground">
                  {bn ? 'একটি চ্যাট বা শিক্ষার্থী নির্বাচন করুন' : 'Select a Conversation or Student'}
                </h4>
                <p className="text-xs leading-relaxed">
                  {bn
                    ? 'বামপাশের তালিকা থেকে "ছাত্র ও অভিভাবক" বা "শিক্ষক ও স্টাফ" ট্যাবে ক্লিক করে যেকোনো শিক্ষার্থীর সাথে ১-ক্লিকে সরাসরি নিরাপদ WhatsApp চ্যাট শুরু করুন।'
                    : 'Click any contact from the left list to start viewing messages, profiles, and sending replies.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Profile & Identity Panel */}
        {selectedChat && showProfilePanel && currentRecipient && (
          <div className="w-80 border-l bg-card p-4 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>{bn ? 'পরিচিতি ও প্রোফাইল' : 'Contact & Profile'}</span>
              </h4>
              <Button size="sm" variant="ghost" onClick={() => setShowProfilePanel(false)} className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Profile Avatar & Primary info */}
            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              {currentRecipient.photoSrc ? (
                <img
                  src={currentRecipient.photoSrc}
                  alt={currentRecipient.headerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-md cursor-pointer"
                  onClick={() => setPreviewImageSrc(currentRecipient.photoSrc || null)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold text-xl border">
                  {currentRecipient.isGrp ? <Users className="w-8 h-8" /> : (currentRecipient.identity?.title || currentRecipient.headerName || '?').charAt(0)}
                </div>
              )}

              <div>
                <h5 className="font-bold text-sm text-foreground">
                  {currentRecipient.headerName}
                </h5>
                {currentRecipient.formattedPhone && (
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {currentRecipient.formattedPhone}
                  </p>
                )}
                {currentRecipient.isGrp && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-700 border-purple-500/30 mt-1">
                    {bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
                  </Badge>
                )}
              </div>
            </div>

            {/* If Student / Guardian is Matched */}
            {currentRecipient.identity?.type === 'student' && (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    🎓 {bn ? 'শিক্ষার্থীর তথ্য' : 'Student Details'}
                  </span>
                  <Badge className="bg-blue-500/15 text-blue-700 text-[10px] border-none">
                    {bn ? 'সক্রিয় ছাত্র' : 'Active'}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'ছাত্রের নাম:' : 'Student Name:'}</span>
                    <span className="font-bold text-foreground">{currentRecipient.identity.title.replace(/\s*\(.*\)$/, '')}</span>
                  </div>
                  {currentRecipient.identity.rollNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'রোল নং:' : 'Roll No:'}</span>
                      <span className="font-mono font-bold text-foreground">{currentRecipient.identity.rollNumber}</span>
                    </div>
                  )}
                  {currentRecipient.identity.divisionName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'বিভাগ / জামাত:' : 'Class / Division:'}</span>
                      <span className="font-semibold text-foreground">{currentRecipient.identity.divisionName}</span>
                    </div>
                  )}
                  {currentRecipient.identity.fatherName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'পিতার নাম:' : "Father's Name:"}</span>
                      <span className="font-medium text-foreground">{currentRecipient.identity.fatherName}</span>
                    </div>
                  )}
                  {currentRecipient.identity.motherName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'মাতার নাম:' : "Mother's Name:"}</span>
                      <span className="font-medium text-foreground">{currentRecipient.identity.motherName}</span>
                    </div>
                  )}
                  {currentRecipient.identity.address && (
                    <div className="pt-1 border-t text-[11px] text-muted-foreground">
                      <span className="font-medium">{bn ? 'ঠিকানা: ' : 'Address: '}</span>
                      <span>{currentRecipient.identity.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  <Button size="sm" asChild variant="default" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full">
                    <Link to={`/admin/students`}>
                      <User className="w-3.5 h-3.5 mr-1.5" />
                      {bn ? 'শিক্ষার্থীর প্রোফাইল দেখুন' : 'View Student Profile'}
                    </Link>
                  </Button>
                  <Button size="sm" asChild variant="outline" className="h-8 text-xs rounded-xl w-full">
                    <Link to={`/admin/students-fees`}>
                      {bn ? 'ফি ও বকেয়া সংক্রান্ত তথ্য' : 'Check Fees & Dues'}
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* If Staff is Matched */}
            {currentRecipient.identity?.type === 'staff' && (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="pb-1 border-b font-semibold text-amber-700 dark:text-amber-400">
                  💼 {bn ? 'স্টাফ / শিক্ষকের তথ্য' : 'Staff Details'}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'পদবী:' : 'Designation:'}</span>
                    <span className="font-bold text-foreground">{currentRecipient.identity.subtitle}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button size="sm" asChild variant="outline" className="h-8 text-xs rounded-xl w-full">
                    <Link to={`/admin/staff`}>
                      {bn ? 'স্টাফ তালিকা দেখুন' : 'View Staff List'}
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* If Unknown Contact */}
            {!currentRecipient.identity && !currentRecipient.isGrp && (
              <div className="rounded-xl border bg-muted/30 p-3 text-xs space-y-2 text-center text-muted-foreground">
                <Info className="w-5 h-5 mx-auto text-muted-foreground/60" />
                <p>
                  {bn
                    ? 'এই নম্বরটি মাদ্রাসার ডেটাবেজে কোনো শিক্ষার্থী বা স্টাফের প্রোফাইলের সাথে সরাসরি ম্যাচ করেনি।'
                    : 'This phone number does not directly match any registered student or staff profile.'}
                </p>
                <div className="pt-1 flex flex-col gap-1.5">
                  <Button size="sm" asChild variant="outline" className="h-8 text-xs rounded-xl w-full">
                    <Link to="/admin/students">
                      {bn ? 'শিক্ষার্থী তালিকায় অনুসন্ধান' : 'Search Students'}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Dialog */}
      <Dialog open={!!previewImageSrc} onOpenChange={() => setPreviewImageSrc(null)}>
        <DialogContent className="max-w-xl p-2 bg-black/95 border-none">
          <div className="relative flex items-center justify-center p-2">
            {previewImageSrc && (
              <img
                src={previewImageSrc}
                alt="Enlarged preview"
                className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
