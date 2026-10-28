import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Search, RefreshCw, Loader2, User, Check,
  CheckCheck, Phone, Clock, ExternalLink, ShieldCheck, AlertCircle,
  Sparkles, MessageSquare, Plus, ArrowLeft, Paperclip, Image as ImageIcon,
  FileText, Download, X, Eye, Info, Users, UserCheck, ChevronRight
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

  // 2. Load Student & Staff phone directory for identity lookup
  const { data: students = [] } = useQuery({
    queryKey: ['inbox_directory_students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name_bn, name_en, roll_number, student_id, phone, guardian_phone, father_name, father_phone, mother_name, mother_phone, address, photo_url, division_id, divisions(name, name_bn)')
        .eq('status', 'active')
        .is('deleted_at', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['inbox_directory_staff'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, phone, photo_url, designation')
        .eq('status', 'active')
        .is('deleted_at', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Map: 10-digit normalized phone number -> Full Identity object
  const directoryMap = useMemo(() => {
    const map = new Map<string, MatchedIdentity>();

    students.forEach((s: any) => {
      const divName = bn ? (s.divisions?.name_bn || s.divisions?.name) : (s.divisions?.name || s.divisions?.name_bn);
      const studentLabel = bn ? s.name_bn : (s.name_en || s.name_bn);
      const sub = `${bn ? 'রোল:' : 'Roll:'} ${s.roll_number || '—'}${divName ? ` | ${divName}` : ''}`;

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

      if (s.guardian_phone) {
        const clean = s.guardian_phone.replace(/\D/g, '').slice(-10);
        map.set(clean, { ...identityData, title: `${studentLabel} (${bn ? 'অভিভাবক' : 'Guardian'})` });
      }
      if (s.father_phone) {
        const clean = s.father_phone.replace(/\D/g, '').slice(-10);
        if (!map.has(clean)) {
          map.set(clean, { ...identityData, title: `${studentLabel} (${bn ? 'পিতা' : 'Father'})` });
        }
      }
      if (s.mother_phone) {
        const clean = s.mother_phone.replace(/\D/g, '').slice(-10);
        if (!map.has(clean)) {
          map.set(clean, { ...identityData, title: `${studentLabel} (${bn ? 'মাতা' : 'Mother'})` });
        }
      }
      if (s.phone) {
        const clean = s.phone.replace(/\D/g, '').slice(-10);
        if (!map.has(clean)) {
          map.set(clean, { ...identityData, title: `${studentLabel} (${bn ? 'ছাত্র' : 'Student'})` });
        }
      }
    });

    staffList.forEach((st: any) => {
      if (st.phone) {
        const clean = st.phone.replace(/\D/g, '').slice(-10);
        const name = bn ? st.name_bn : (st.name_en || st.name_bn);
        map.set(clean, {
          type: 'staff',
          title: name,
          subtitle: st.designation || (bn ? 'স্টাফ/শিক্ষক' : 'Staff'),
          photoUrl: st.photo_url || undefined,
          recordId: st.id,
        });
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

  // Helper to format clean Bangladeshi / international phone number
  const formatPhoneNumber = (raw: string) => {
    if (!raw) return '';
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('01')) {
      return `+880 ${clean.substring(1, 5)}-${clean.substring(5)}`;
    }
    if (clean.length === 13 && clean.startsWith('8801')) {
      return `+880 ${clean.substring(3, 7)}-${clean.substring(7)}`;
    }
    if (clean.length === 10 && clean.startsWith('1')) {
      return `+880 ${clean.substring(0, 4)}-${clean.substring(4)}`;
    }
    if (clean.length >= 7 && clean.length <= 13) {
      return `+${clean}`;
    }
    return '';
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

      // Parse & normalize chats matching real mobile WhatsApp names & phone numbers
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

          // Name resolution hierarchy:
          // 1. Group: group subject/pushName
          // 2. Saved contact name from phone address book
          // 3. WhatsApp profile pushName
          // 4. Fallback: formatted real phone number
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

      // Evolution API v2: MUST query { where: { key: { remoteJid } }, limit: 100 }
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

        // Read file as Base64 Data URL
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

        // Optimistically append media message
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

        // Optimistically append outgoing message
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
    if (!raw || raw.length < 10) {
      toast.error(bn ? 'সঠিক ফোন নম্বর দিন' : 'Enter a valid phone number');
      return;
    }
    const fullPhone = raw.startsWith('88') ? raw : (raw.startsWith('01') ? '88' + raw : '880' + raw);
    const jid = `${fullPhone}@s.whatsapp.net`;

    const newChat: ChatItem = {
      id: jid,
      remoteJid: jid,
      phone: fullPhone,
      name: formatPhoneNumber(fullPhone),
      lastMessageText: '',
      lastMessageTime: Date.now(),
      isGroup: false,
    };

    setSelectedChat(newChat);
    setMessages([]);
    setShowNewChatInput(false);
    setNewChatPhone('');
  };

  // Filter chats by search and category filter
  const filteredChats = useMemo(() => {
    let list = chats;

    // Filter tab
    if (activeFilter === 'students') {
      list = list.filter(c => !c.isGroup && directoryMap.get(c.phone.slice(-10))?.type === 'student');
    } else if (activeFilter === 'staff') {
      list = list.filter(c => !c.isGroup && directoryMap.get(c.phone.slice(-10))?.type === 'staff');
    } else if (activeFilter === 'groups') {
      list = list.filter(c => c.isGroup);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => {
      const matchPhone = c.phone.includes(q);
      const matchName = (c.name || '').toLowerCase().includes(q) || (c.pushName || '').toLowerCase().includes(q);
      const identity = directoryMap.get(c.phone.slice(-10));
      const matchIdentity = identity?.title.toLowerCase().includes(q) || identity?.subtitle.toLowerCase().includes(q) || (identity?.rollNumber || '').includes(q);
      return matchPhone || matchName || matchIdentity;
    });
  }, [chats, searchQuery, activeFilter, directoryMap]);

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

  // Get active matched identity
  const activeIdentity = useMemo(() => {
    if (!selectedChat || selectedChat.isGroup) return null;
    return directoryMap.get(selectedChat.phone.slice(-10)) || null;
  }, [selectedChat, directoryMap]);

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
              {bn ? 'অভিভাবকদের ইনকামিং বার্তা, প্রোফাইল ও সরাসরি রিপ্লাই' : 'Live incoming messages from guardians & contacts'}
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
            <span>{bn ? 'নতুন চ্যাট' : 'New Chat'}</span>
          </Button>
        </div>
      </div>

      {/* New Chat Input Bar */}
      {showNewChatInput && (
        <div className="p-3 bg-emerald-500/10 border-b flex items-center gap-2 animate-in fade-in shrink-0">
          <Input
            placeholder={bn ? 'নম্বর লিখুন (যেমন: 017XXXXXXXX বা 88017XXXXXXXX)' : 'Enter phone number'}
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

      {/* Main Inbox Layout: Left (Contacts) + Center (Chat Window) + Right (Profile Panel) */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Sidebar: Contact list */}
        <div className={`w-full sm:w-80 md:w-96 border-r flex flex-col bg-muted/20 shrink-0 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
          {/* Search Box */}
          <div className="p-2.5 border-b bg-background space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder={bn ? 'নাম, রোল বা মোবাইল দিয়ে খুঁজুন...' : 'Search by name, roll, phone...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/50 rounded-xl"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-0.5">
              {[
                { key: 'all', label: bn ? 'সকল চ্যাট' : 'All' },
                { key: 'students', label: bn ? 'ছাত্র ও অভিভাবক' : 'Students' },
                { key: 'staff', label: bn ? 'স্টাফ' : 'Staff' },
                { key: 'groups', label: bn ? 'গ্রুপ' : 'Groups' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key as any)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
                    activeFilter === f.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chats Scroll List */}
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
                <p>{bn ? 'অভিভাবকদের পাঠানো মেসেজ ও রিপ্লাই এখানে প্রদর্শিত হবে।' : 'Messages will appear here.'}</p>
              </div>
            ) : (
              filteredChats.map(c => {
                const isSelected = selectedChat?.remoteJid === c.remoteJid;
                const cleanLast10 = c.phone.slice(-10);
                const identity = directoryMap.get(cleanLast10);

                // Display name resolver
                let displayName = c.name || c.pushName || '';
                if (c.isGroup) {
                  displayName = c.pushName || c.name || (bn ? 'গ্রুপ চ্যাট' : 'Group Chat');
                } else if (identity) {
                  displayName = identity.title;
                } else if (!displayName && c.phone) {
                  displayName = formatPhoneNumber(c.phone);
                }

                // Avatar photo priority
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
                          onError={(e) => {
                            // Fallback to initial if image fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
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

                      {/* Phone number & Student / Staff / Group Badges */}
                      <div className="flex items-center gap-1.5 text-[11px] mb-0.5 flex-wrap">
                        {identity && (
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 shrink-0 ${
                            identity.type === 'student'
                              ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          }`}>
                            {identity.subtitle}
                          </Badge>
                        )}

                        {!c.isGroup && c.phone && formatPhoneNumber(c.phone) && displayName !== formatPhoneNumber(c.phone) && (
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium text-[10px] shrink-0 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {formatPhoneNumber(c.phone)}
                          </span>
                        )}

                        {c.isGroup && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-700 border-purple-500/30 shrink-0">
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
        </div>

        {/* Center Area: Chat Window */}
        <div className={`flex-1 min-w-0 flex flex-col bg-background overflow-hidden ${selectedChat ? 'flex' : 'hidden sm:flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              {(() => {
                const cleanLast10 = selectedChat.phone.slice(-10);
                const identity = directoryMap.get(cleanLast10);
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

                return (
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

                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={headerName}
                          onClick={() => setPreviewImageSrc(photoSrc)}
                          className="w-9 h-9 rounded-full object-cover border border-border/80 cursor-pointer shadow-xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isGrp ? 'bg-purple-500/15 text-purple-700' : 'bg-emerald-500/15 text-emerald-700'
                        }`}>
                          {isGrp ? <Users className="w-4 h-4" /> : headerName.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2 truncate">
                          <span className="truncate">{headerName}</span>
                          {identity?.type === 'student' && (
                            <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-500/10 border-blue-500/30 shrink-0">
                              {bn ? 'শিক্ষার্থীর অভিভাবক' : 'Guardian'}
                            </Badge>
                          )}
                          {isGrp && (
                            <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-500/10 border-purple-500/30 shrink-0">
                              {bn ? 'গ্রুপ' : 'Group'}
                            </Badge>
                          )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                          {!isGrp ? (
                            <>
                              {selectedChat.phone && formatPhoneNumber(selectedChat.phone) ? (
                                <>
                                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="font-mono font-medium">{formatPhoneNumber(selectedChat.phone)}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">{bn ? 'হোয়াটসঅ্যাপ যোগাযোগ' : 'WhatsApp Contact'}</span>
                              )}
                              {identity?.subtitle && <span className="text-emerald-700 font-medium truncate">({identity.subtitle})</span>}
                            </>
                          ) : (
                            <span className="text-purple-700 font-medium">{bn ? 'সদস্যদের গ্রুপ বার্তা' : 'Group conversation'}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* View Profile Drawer Toggle */}
                      <Button
                        variant={showProfilePanel ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowProfilePanel(prev => !prev)}
                        className="h-8 gap-1.5 text-xs rounded-xl"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden md:inline">{bn ? 'প্রোফাইল' : 'Profile'}</span>
                      </Button>

                      {!isGrp && selectedChat.phone && formatPhoneNumber(selectedChat.phone) && (
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
                );
              })()}

              {/* Chat Messages Body */}
              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-muted/10">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <p className="text-xs">{bn ? 'চ্যাট হিস্ট্রি লোড হচ্ছে...' : 'Loading chat history...'}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground max-w-sm mx-auto space-y-1.5">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-bold text-foreground">{bn ? 'কোনো পূর্ববর্তী বার্তা নেই' : 'No previous messages'}</p>
                    <p>{bn ? 'নিচের ইনপুট থেকে বার্তা পাঠিয়ে সরাসরি কথোপকথন শুরু করুন।' : 'Send a message below to start chatting.'}</p>
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
                <div className="px-3 py-1.5 bg-background border-t flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 min-w-0">
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
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                    />

                    {/* Paperclip attachment button */}
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
                  {bn ? 'একটি চ্যাট নির্বাচন করুন' : 'Select a Conversation'}
                </h4>
                <p className="text-xs leading-relaxed">
                  {bn
                    ? 'বামপাশের তালিকা থেকে যেকোনো অভিভাবক বা নম্বরের উপর ক্লিক করে তাদের সাথে লাইভ চ্যাট দেখুন, প্রোফাইল যাচাই করুন ও ফাইল/রিপ্লাই পাঠান।'
                    : 'Click any contact from the left list to start viewing messages, profiles, and sending replies.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Profile & Identity Panel */}
        {selectedChat && showProfilePanel && (
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
              {(() => {
                const photoSrc = selectedChat.profilePicUrl || activeIdentity?.photoUrl;
                return photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={selectedChat.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-md cursor-pointer"
                    onClick={() => setPreviewImageSrc(photoSrc)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold text-xl border">
                    {selectedChat.isGroup ? <Users className="w-8 h-8" /> : (activeIdentity?.title || selectedChat.name || '?').charAt(0)}
                  </div>
                );
              })()}

              <div>
                <h5 className="font-bold text-sm text-foreground">
                  {activeIdentity?.title || selectedChat.name || selectedChat.pushName || (selectedChat.isGroup ? (bn ? 'গ্রুপ চ্যাট' : 'Group') : (selectedChat.phone ? formatPhoneNumber(selectedChat.phone) : 'WhatsApp Contact'))}
                </h5>
                {!selectedChat.isGroup && selectedChat.phone && formatPhoneNumber(selectedChat.phone) && (
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {formatPhoneNumber(selectedChat.phone)}
                  </p>
                )}
                {selectedChat.isGroup && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-700 border-purple-500/30 mt-1">
                    {bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
                  </Badge>
                )}
              </div>
            </div>

            {/* If Student / Guardian is Matched */}
            {activeIdentity?.type === 'student' && (
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
                    <span className="font-bold text-foreground">{activeIdentity.title.replace(/\s*\(.*\)$/, '')}</span>
                  </div>
                  {activeIdentity.rollNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'রোল নং:' : 'Roll No:'}</span>
                      <span className="font-mono font-bold text-foreground">{activeIdentity.rollNumber}</span>
                    </div>
                  )}
                  {activeIdentity.divisionName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'বিভাগ / জামাত:' : 'Class / Division:'}</span>
                      <span className="font-semibold text-foreground">{activeIdentity.divisionName}</span>
                    </div>
                  )}
                  {activeIdentity.fatherName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'পিতার নাম:' : "Father's Name:"}</span>
                      <span className="font-medium text-foreground">{activeIdentity.fatherName}</span>
                    </div>
                  )}
                  {activeIdentity.motherName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'মাতার নাম:' : "Mother's Name:"}</span>
                      <span className="font-medium text-foreground">{activeIdentity.motherName}</span>
                    </div>
                  )}
                  {activeIdentity.address && (
                    <div className="pt-1 border-t text-[11px] text-muted-foreground">
                      <span className="font-medium">{bn ? 'ঠিকানা: ' : 'Address: '}</span>
                      <span>{activeIdentity.address}</span>
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
            {activeIdentity?.type === 'staff' && (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="pb-1 border-b font-semibold text-amber-700 dark:text-amber-400">
                  💼 {bn ? 'স্টাফ / শিক্ষকের তথ্য' : 'Staff Details'}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'পদবী:' : 'Designation:'}</span>
                    <span className="font-bold text-foreground">{activeIdentity.subtitle}</span>
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
            {!activeIdentity && !selectedChat.isGroup && (
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
