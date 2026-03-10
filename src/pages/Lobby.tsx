import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, LogIn as JoinIcon, Copy, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PlayerColor } from '@/lib/hexUtils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const Lobby: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [hostColor, setHostColor] = useState<PlayerColor>('blue');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  const createRoom = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('game_rooms')
      .insert({ host_id: user.id, host_color: hostColor, status: 'waiting' })
      .select('id, room_code')
      .single();
    setCreating(false);

    if (error) {
      toast.error('Грешка при създаване на стая: ' + error.message);
      return;
    }
    if (data) {
      navigate(`/room/${data.id}`);
    }
  };

  const joinRoom = async () => {
    if (!user || !roomCode.trim()) return;
    setJoining(true);
    const code = roomCode.trim().toUpperCase();

    const { data: roomId, error } = await supabase
      .rpc('join_room', { p_room_code: code });

    setJoining(false);
    if (error || !roomId) {
      toast.error('Стаята не е намерена или вече е заета');
      return;
    }
    navigate(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Мултиплейър Лоби
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Здравей, <span className="text-foreground font-medium">{profile?.display_name || 'Player'}</span>!
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-6 shadow-xl">
          {/* Create Room */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Създай нова стая
            </label>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                Твой цвят
              </label>
              <RadioGroup
                value={hostColor}
                onValueChange={(v) => setHostColor(v as PlayerColor)}
                className="grid grid-cols-2 gap-2"
              >
                <div>
                  <RadioGroupItem value="blue" id="host-blue" className="peer sr-only" />
                  <Label
                    htmlFor="host-blue"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5 cursor-pointer transition-all
                    peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary/50"
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                    <span className="text-xs font-medium">Син</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="red" id="host-red" className="peer sr-only" />
                  <Label
                    htmlFor="host-red"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5 cursor-pointer transition-all
                    peer-data-[state=checked]:border-destructive/50 peer-data-[state=checked]:bg-destructive/10 [&:has([data-state=checked])]:border-destructive/50"
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                    <span className="text-xs font-medium">Червен</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              onClick={createRoom}
              disabled={creating}
              className="w-full bg-gradient-to-r from-primary to-primary/80 rounded-xl group"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Създай стая
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">или</span>
            </div>
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Присъедини се с код
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Въведи код (напр. AB12CD)"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-secondary/50 uppercase tracking-widest text-center font-mono"
              />
              <Button
                onClick={joinRoom}
                disabled={joining || !roomCode.trim()}
                className="shrink-0 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-xl"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <JoinIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Локална игра
          </button>
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" />
            Изход
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
