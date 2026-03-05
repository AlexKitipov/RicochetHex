import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface RoomData {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  host_color: string;
  status: string;
  winner: string | null;
  game_state: any;
}

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Fetch room data
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error || !data) {
        toast.error('Стаята не е намерена');
        navigate('/lobby');
        return;
      }
      setRoom(data as unknown as RoomData);
      setLoadingRoom(false);
    };
    fetchRoom();
  }, [roomId, navigate]);

  // Subscribe to room changes (realtime)
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as unknown as RoomData);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  const copyRoomCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.room_code);
    toast.success(`Кодът ${room.room_code} е копиран!`);
  };

  const copyRoomLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/join/${room.room_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Линкът е копиран!');
  };

  if (loading || loadingRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) return null;

  const isHost = user?.id === room.host_id;
  const isGuest = user?.id === room.guest_id;
  const isWaiting = room.status === 'waiting';
  const isPlaying = room.status === 'playing';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Стая
            </span>
          </h1>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5 shadow-xl">
          {/* Room code display */}
          <div className="text-center space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Код на стаята
            </label>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-[0.3em] text-foreground">
                {room.room_code}
              </span>
              <Button variant="ghost" size="icon" onClick={copyRoomCode} className="shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={copyRoomLink} className="text-xs">
              <Copy className="h-3 w-3 mr-1" />
              Копирай линк за покана
            </Button>
          </div>

          {/* Players status */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Играчи
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border p-3 text-center ${room.host_color === 'blue' ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className={`w-6 h-6 mx-auto rounded-full bg-gradient-to-br ${room.host_color === 'blue' ? 'from-blue-400 to-blue-600' : 'from-red-400 to-red-600'}`} />
                <p className="text-xs font-semibold mt-1">{isHost ? 'Ти (хост)' : 'Хост'}</p>
                <p className="text-[10px] text-muted-foreground">Готов ✓</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${room.host_color === 'blue' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                <div className={`w-6 h-6 mx-auto rounded-full ${room.guest_id ? `bg-gradient-to-br ${room.host_color === 'blue' ? 'from-red-400 to-red-600' : 'from-blue-400 to-blue-600'}` : 'bg-secondary border-2 border-dashed border-muted-foreground/30'}`} />
                <p className="text-xs font-semibold mt-1">
                  {room.guest_id ? (isGuest ? 'Ти' : 'Играч 2') : 'Чака...'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {room.guest_id ? 'Готов ✓' : 'Изпрати кода'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          {isWaiting && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Изчакване на втори играч...
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Изпрати кода или линка на приятел
              </p>
            </div>
          )}

          {isPlaying && (
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">
                🎮 Играта е в ход! (Скоро: борд за игра тук)
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Реалната игра ще бъде добавена в следващата стъпка
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-start mt-4">
          <button
            onClick={() => navigate('/lobby')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Обратно в лобито
          </button>
        </div>
      </div>
    </div>
  );
};

export default Room;
