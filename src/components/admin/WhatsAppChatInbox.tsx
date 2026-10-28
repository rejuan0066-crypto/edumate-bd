import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Search, RefreshCw, Loader2, User, Check,
  CheckCheck, Phone, Clock, ExternalLink, ShieldCheck, AlertCircle,
  Sparkles, MessageSquare, Plus, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatItem {
  id: string; // remoteJid, e.g. "88017xxxxxxxx@s.whatsapp.net"
  name?: string;
  pushName?: string;
  unreadCount?: number;
  lastMessageText?: string;
  lastMessageTime?: number;
  phone: string;
}

interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  status?: string;
  senderName?: string;
}

interface WhatsAppChatInboxProps {
  canReply?: boolean;
}

export default function WhatsAppChatInbox({ canReply = true }: WhatsAppChatInboxProps) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

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
        .select('id, name_bn, name_en, roll_number, phone, guardian_phone, divisions(name, name_bn)')
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
        .select('id, name_bn, name_en, phone, designation')
        .eq('status', 'active')
        .is('deleted_at', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Phone lookup map: normalized 10-11 digit -> Identity info
  const directoryMap = useMemo(() => {
    const map = new Map<string, { title: string; subtitle: string; type: 'student' | 'staff' }>();

    students.forEach((s: any) => {
      const divName = bn ? (s.divisions?.name_bn || s.divisions?.name) : (s.divisions?.name || s.divisions?.name_bn);
      const studentLabel = bn ? s.name_bn : (s.name_en || s.name_bn);
      const sub = `${bn ? 'রোল:' : 'Roll:'} ${s.roll_number || '—'}${divName ? ` | ${divName}` : ''}`;

      if (s.guardian_phone) {
        const clean = s.guardian_phone.replace(/\D/g, '').slice(-10);
        map.set(clean, {
          title: `${studentLabel} (${bn ? 'অভিভাবক' : 'Guardian'})`,
          subtitle: sub,
          type: 'student',
        });
      }
      if (s.phone) {
        const clean = s.phone.replace(/\D/g, '').slice(-10);
        if (!map.has(clean)) {
          map.set(clean, {
            title: `${studentLabel} (${bn ? 'ছাত্র' : 'Student'})`,
            subtitle: sub,
            type: 'student',
          });
        }
      }
    });

    staffList.forEach((st: any) => {
      if (st.phone) {
        const clean = st.phone.replace(/\D/g, '').slice(-10);
        const name = bn ? st.name_bn : (st.name_en || st.name_bn);
        map.set(clean, {
          title: `${name} (${bn ? 'স্টাফ/শিক্ষক' : 'Staff'})`,
          subtitle: st.designation || '',
          type: 'staff',
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

  // Messages in active chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // New Chat modal / input
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
    return m.text || '';
  };

  // Fetch Chats from Evolution API
  const fetchChats = async (silent = false) => {
    if (!serverUrl || !isEnabled) return;
    if (!silent) setLoadingChats(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      let chatList: any[] = [];
      // Try GET /chat/findChats/:instance
      try {
        const resp = await fetch(`${serverUrl}/chat/findChats/${encodeURIComponent(instance)}`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          chatList = Array.isArray(data) ? data : data?.chats || [];
        }
      } catch { /* ignore */ }

      // Fallback: POST /chat/findChats/:instance
      if (!chatList.length) {
        try {
          const resp = await fetch(`${serverUrl}/chat/findChats/${encodeURIComponent(instance)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          });
          if (resp.ok) {
            const data = await resp.json();
            chatList = Array.isArray(data) ? data : data?.chats || [];
          }
        } catch { /* ignore */ }
      }

      // Normalize chats
      const parsed: ChatItem[] = chatList
        .filter((c: any) => {
          const jid = c.id || c.remoteJid || '';
          return jid && !jid.includes('@g.us') && !jid.includes('status@broadcast');
        })
        .map((c: any) => {
          const jid = c.id || c.remoteJid || '';
          const rawPhone = jid.replace(/@.*$/, '');
          const lastMsg = c.lastMessage || {};
          const ts = lastMsg.messageTimestamp ? Number(lastMsg.messageTimestamp) * 1000 : Date.now();
          const text = extractMessageText(lastMsg);

          return {
            id: jid,
            name: c.name || c.pushName || '',
            pushName: c.pushName || '',
            unreadCount: c.unreadCount || 0,
            lastMessageText: text,
            lastMessageTime: ts,
            phone: rawPhone,
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

  // Periodic poll for new chats and messages (every 5 seconds)
  useEffect(() => {
    if (!serverUrl || !isEnabled || gatewayOnline === false) return;
    const timer = setInterval(() => {
      fetchChats(true);
      if (selectedChat) {
        fetchMessages(selectedChat.id, true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [serverUrl, instance, apiKey, isEnabled, gatewayOnline, selectedChat?.id]);

  // Fetch messages for a specific chat
  const fetchMessages = async (remoteJid: string, silent = false) => {
    if (!serverUrl) return;
    if (!silent) setLoadingMessages(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      let msgList: any[] = [];

      // 1. Try POST /chat/findMessages/:instance
      try {
        const resp = await fetch(`${serverUrl}/chat/findMessages/${encodeURIComponent(instance)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            where: { key: { remoteJid } },
            limit: 50,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          msgList = Array.isArray(data) ? data : data?.messages?.records || data?.records || [];
        }
      } catch { /* ignore */ }

      // 2. Try GET /chat/findMessages/:instance?remoteJid=...
      if (!msgList.length) {
        try {
          const resp = await fetch(`${serverUrl}/chat/findMessages/${encodeURIComponent(instance)}?remoteJid=${encodeURIComponent(remoteJid)}&limit=50`, {
            headers,
          });
          if (resp.ok) {
            const data = await resp.json();
            msgList = Array.isArray(data) ? data : data?.messages?.records || data?.records || [];
          }
        } catch { /* ignore */ }
      }

      const parsed: ChatMessage[] = msgList.map((m: any) => {
        const text = extractMessageText(m);
        const ts = m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : (m.timestamp ? Number(m.timestamp) * 1000 : Date.now());
        const fromMe = m.key ? !!m.key.fromMe : !!m.fromMe;
        const msgId = m.key?.id || m.id || String(Math.random());

        return {
          id: msgId,
          fromMe,
          text,
          timestamp: ts,
          status: m.status || 'SENT',
          senderName: m.pushName || '',
        };
      }).sort((a, b) => a.timestamp - b.timestamp);

      setMessages(parsed);
      if (!silent) setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.warn('Error fetching messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  };

  // Send Reply Message
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat || !serverUrl) return;
    if (!canReply) {
      toast.error(bn ? 'আপনার মেসেজ পাঠানোর অনুমতি নেই' : 'You do not have permission to reply');
      return;
    }

    const textToSend = replyText.trim();
    setSending(true);

    try {
      const cleanPhone = selectedChat.phone.replace(/\D/g, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['apikey'] = apiKey;

      const resp = await fetch(`${serverUrl}/message/sendText/${encodeURIComponent(instance)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: cleanPhone,
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
      };

      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      setTimeout(scrollToBottom, 50);

      toast.success(bn ? 'মেসেজ পাঠানো হয়েছে' : 'Message sent');

      // Refresh messages after 1.5s
      setTimeout(() => fetchMessages(selectedChat.id, true), 1500);
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
      phone: fullPhone,
      name: fullPhone,
      lastMessageText: '',
      lastMessageTime: Date.now(),
    };

    setSelectedChat(newChat);
    setMessages([]);
    setShowNewChatInput(false);
    setNewChatPhone('');
  };

  // Filter chats by search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase().trim();
    return chats.filter(c => {
      const matchPhone = c.phone.includes(q);
      const matchName = (c.name || '').toLowerCase().includes(q) || (c.pushName || '').toLowerCase().includes(q);
      const identity = directoryMap.get(c.phone.slice(-10));
      const matchIdentity = identity?.title.toLowerCase().includes(q) || identity?.subtitle.toLowerCase().includes(q);
      return matchPhone || matchName || matchIdentity;
    });
  }, [chats, searchQuery, directoryMap]);

  // Canned quick replies
  const quickReplies = [
    bn ? 'আসসালামু আলাইকুম, আপনার বার্তাটি পেয়েছি।' : 'Assalamu Alaikum, received your message.',
    bn ? 'ফি ও বকেয়া সম্পর্কিত বিস্তারিত জানতে মাদ্রাসার অফিসে যোগাযোগ করুন।' : 'Please contact the office for fee inquiries.',
    bn ? 'ইনশাআল্লাহ আমরা বিষয়টি দ্রুত দেখে ব্যবস্থা নিচ্ছি।' : 'We are looking into this shortly.',
    bn ? 'জাযাকাল্লাহু খাইরান।' : 'JazakAllahu Khair.',
  ];

  // Formatting helpers
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
    <div className="rounded-2xl border bg-background shadow-xs overflow-hidden flex flex-col h-[700px]">
      {/* Top Banner / Toolbar */}
      <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
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
              {bn ? 'অভিভাবকদের ইনকামিং মেসেজ ও সরাসরি রিপ্লাই সিস্টেম' : 'Live incoming messages from guardians & contacts'}
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
        <div className="p-3 bg-emerald-500/10 border-b flex items-center gap-2 animate-in fade-in">
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

      {/* Main Inbox Layout: Left (Contacts) + Right (Chat Window) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Contact list */}
        <div className={`w-full sm:w-80 md:w-96 border-r flex flex-col bg-muted/20 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
          {/* Search Box */}
          <div className="p-2.5 border-b bg-background">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder={bn ? 'নাম, রোল বা মোবাইল দিয়ে খুঁজুন...' : 'Search by name, roll, phone...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/50 rounded-xl"
              />
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
                const isSelected = selectedChat?.id === c.id;
                const cleanLast10 = c.phone.slice(-10);
                const identity = directoryMap.get(cleanLast10);
                const displayName = identity?.title || c.pushName || c.name || `+${c.phone}`;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectChat(c)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/60 ${
                      isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                        identity?.type === 'student' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' :
                        identity?.type === 'staff' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {displayName.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                      {c.unreadCount ? (
                        <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-foreground truncate">
                          {displayName}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {formatTime(c.lastMessageTime)}
                        </span>
                      </div>

                      {identity?.subtitle && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate mb-0.5">
                          {identity.subtitle}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.lastMessageText || `📱 +${c.phone}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className={`flex-1 flex flex-col bg-background ${selectedChat ? 'flex' : 'hidden sm:flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              {(() => {
                const cleanLast10 = selectedChat.phone.slice(-10);
                const identity = directoryMap.get(cleanLast10);
                const displayName = identity?.title || selectedChat.pushName || selectedChat.name || `+${selectedChat.phone}`;

                return (
                  <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedChat(null)}
                        className="sm:hidden p-1.5 h-8 w-8"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {displayName.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                          <span>{displayName}</span>
                          {identity?.type === 'student' && (
                            <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-500/10 border-blue-500/30">
                              {bn ? 'শিক্ষার্থীর অভিভাবক' : 'Guardian'}
                            </Badge>
                          )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span className="font-mono">+{selectedChat.phone}</span>
                          {identity?.subtitle && <span className="text-emerald-700 font-medium">({identity.subtitle})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 gap-1.5 text-xs rounded-xl"
                      >
                        <a
                          href={`https://web.whatsapp.com/send?phone=${selectedChat.phone}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">{bn ? 'WhatsApp Web এ খুলুন' : 'Open in WhatsApp Web'}</span>
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchMessages(selectedChat.id)}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <p className="text-xs">{bn ? 'বার্তা লোড হচ্ছে...' : 'Loading messages...'}</p>
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
                        {!m.fromMe && m.senderName && (
                          <p className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                            {m.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
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
                <div className="px-3 py-1.5 bg-background border-t flex items-center gap-1.5 overflow-x-auto text-[11px]">
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

              {/* Chat Input Bar */}
              <div className="p-3 bg-background border-t">
                {canReply ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="flex items-end gap-2"
                  >
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder={bn ? 'মেসেজ লিখুন... (Enter চাপলে পাঠানো হবে)' : 'Type a reply... (Enter to send)'}
                      className="min-h-[42px] max-h-24 resize-none text-xs rounded-xl"
                      rows={1}
                    />
                    <Button
                      type="submit"
                      disabled={sending || !replyText.trim()}
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
                    ? 'বামপাশের তালিকা থেকে যেকোনো অভিভাবক বা নম্বরের উপর ক্লিক করে তাদের সাথে লাইভ চ্যাট দেখুন ও রিপ্লাই দিন।'
                    : 'Click any contact from the left list to start viewing messages and replying.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
