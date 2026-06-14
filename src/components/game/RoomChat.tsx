import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

interface RoomChatProps {
  roomId: string;
  userId: string;
  displayName: string;
  hostId: string;
  guestId: string | null;
  onIncomingMessage?: () => void;
}

export const RoomChat: React.FC<RoomChatProps> = ({ roomId, userId, displayName, hostId, guestId, onIncomingMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    load();
  }, [roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== userId) {
            onIncomingMessage?.();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    // Defer to next frame so the browser batches layout reads/writes
    // and avoids a forced synchronous reflow after DOM mutation.
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: userId,
      message: text,
    });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderLabel = (senderId: string) => {
    if (senderId === userId) return 'You';
    if (senderId === hostId) return 'Host';
    return 'Player 2';
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-xl bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <MessageCircle className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Chat</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {messages.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-4">No messages yet</p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-muted-foreground mb-0.5">
                  {getSenderLabel(msg.sender_id)}
                </span>
                <div className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] break-words ${
                  isMe 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {msg.message}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="px-2 py-2 border-t border-border flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 1000))}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="h-8 text-xs"
          disabled={sending}
          maxLength={1000}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
