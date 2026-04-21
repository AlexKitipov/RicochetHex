import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, ArrowLeft, Crown, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import type { PlayerColor } from '@/lib/hexUtils';

const HexBoard = lazy(() => import('@/components/game/HexBoard').then(m => ({ default: m.HexBoard })));
const MoveHistory = lazy(() => import('@/components/game/MoveHistory').then(m => ({ default: m.MoveHistory })));
import { RoomChat } from '@/components/game/RoomChat';

interface RoomData {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  host_color: string;
  status: string;
  winner: string | null;
  game_state: any;
  rematch_requested_by: string | null;
}

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { playSound } = useSoundEffects();
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
        toast.error('Room not found');
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
      .channel(`room-meta-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const newRoom = payload.new as unknown as RoomData;
          setRoom(prev => {
            if (prev?.status === 'finished' && newRoom.status === 'playing') {
              playSound('rematch');
              toast.success('Rematch! The game starts again!');
            }
            if (newRoom.rematch_requested_by && newRoom.rematch_requested_by !== user?.id && !prev?.rematch_requested_by) {
              playSound('yourTurn');
              toast.info('Your opponent requests a rematch!');
            }
            return {
              ...prev!,
              status: newRoom.status,
              guest_id: newRoom.guest_id,
              winner: newRoom.winner,
              host_color: newRoom.host_color,
              rematch_requested_by: newRoom.rematch_requested_by,
            };
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}&reason=auth-required`, { replace: true });
    }
  }, [loading, user, navigate, location.pathname]);

  const isHost = user?.id === room?.host_id;
  const isGuest = user?.id === room?.guest_id;
  const myColor: PlayerColor = isHost
    ? (room?.host_color as PlayerColor || 'blue')
    : (room?.host_color === 'blue' ? 'red' : 'blue');

  const isPlaying = room?.status === 'playing';
  const isWaiting = room?.status === 'waiting';
  const isFinished = room?.status === 'finished';

  const { gameState, selectHex, isMyTurn } = useMultiplayerGame({
    roomId: roomId || '',
    userId: user?.id || '',
    myColor,
    isPlaying: isPlaying || false,
  });

  const copyRoomCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.room_code);
    toast.success(`Code ${room.room_code} copied!`);
  };

  const copyRoomLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/join/${room.room_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const requestRematch = useCallback(async () => {
    if (!room || !user) return;

    const { data: result, error } = await supabase.rpc('request_rematch', {
      p_room_id: room.id,
    });

    if (error) {
      toast.error('Error requesting rematch');
      return;
    }

    if (result === 'accepted') {
      playSound('rematch');
      toast.success('Rematch! The game starts again!');
    } else {
      setRoom(prev => prev ? { ...prev, rematch_requested_by: user.id } : prev);
      playSound('select');
      toast.info('Rematch request sent!');
    }
  }, [room, user, playSound]);

  if (loading || loadingRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room || !user) return null;

  // Waiting screen
  if (isWaiting) {
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
                Room
              </span>
            </h1>
          </div>

          <div className="glass rounded-2xl p-6 space-y-5 shadow-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Room Code
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
                Copy invite link
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">Players</label>
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl border p-3 text-center ${room.host_color === 'blue' ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className={`w-6 h-6 mx-auto rounded-full bg-gradient-to-br ${room.host_color === 'blue' ? 'from-blue-400 to-blue-600' : 'from-red-400 to-red-600'}`} />
                  <p className="text-xs font-semibold mt-1">{isHost ? 'You (host)' : 'Host'}</p>
                  <p className="text-[10px] text-muted-foreground">Ready ✓</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${room.host_color === 'blue' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                  <div className={`w-6 h-6 mx-auto rounded-full ${room.guest_id ? `bg-gradient-to-br ${room.host_color === 'blue' ? 'from-red-400 to-red-600' : 'from-blue-400 to-blue-600'}` : 'bg-secondary border-2 border-dashed border-muted-foreground/30'}`} />
                  <p className="text-xs font-semibold mt-1">{room.guest_id ? (isGuest ? 'You' : 'Player 2') : 'Waiting...'}</p>
                  <p className="text-[10px] text-muted-foreground">{room.guest_id ? 'Ready ✓' : 'Share the code'}</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for second player...
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Share the code or link with a friend</p>
            </div>
          </div>

          <div className="flex justify-start mt-4">
            <button onClick={() => navigate('/lobby')} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Back to lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen (playing or finished)
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shrink-0 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
          <button onClick={() => navigate('/lobby')} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Lobby
          </button>
          <h1 className="text-sm md:text-base font-bold text-center">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RicochetHex Online
            </span>
          </h1>
          <div className="text-xs text-muted-foreground">
            Room: <span className="font-mono font-bold">{room.room_code}</span>
          </div>
        </div>
      </header>

      {/* Turn indicator */}
      <div className="shrink-0 px-4 py-1.5 border-b border-border bg-card/40">
        <div className="container mx-auto flex items-center justify-center gap-3">
          {isFinished ? (
            <div className="flex items-center gap-3">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold">
                {gameState.winner === myColor ? '🎉 You won!' : '😔 Your opponent won'}
              </span>
              {room.rematch_requested_by === user.id ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for response...
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={requestRematch} className="text-xs h-7 gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {room.rematch_requested_by ? 'Accept Rematch' : 'Rematch'}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={`w-3 h-3 rounded-full ${
                gameState.currentPlayer === 'blue'
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                  : 'bg-gradient-to-br from-red-400 to-red-600'
              }`} />
              <span className="text-xs font-medium">
                {isMyTurn ? '🎯 Your turn' : '⏳ Opponent\'s turn...'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                (You are {myColor === 'blue' ? '🔵 Blue' : '🔴 Red'})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main game area */}
      <main className="flex-1 min-h-0 container mx-auto px-2 md:px-4 py-2 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }>
          <div className={`h-full gap-2 ${
            isMobile
              ? 'flex flex-col'
              : 'grid grid-cols-[1fr_220px_200px]'
          }`}>
            {/* Game Board */}
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
              <HexBoard
                pawns={gameState.pawns}
                selectedHex={gameState.selectedHex}
                possibleMoves={gameState.possibleMoves}
                ricochetPath={gameState.ricochetPath}
                onHexClick={selectHex}
              />
            </div>

            {/* Move History */}
            <div className={`${isMobile ? 'h-24 shrink-0' : 'min-h-0 overflow-hidden'}`}>
              <MoveHistory
                moves={gameState.moveHistory}
                currentIndex={gameState.historyIndex}
              />
            </div>

            {/* Chat */}
            <div className={`${isMobile ? 'h-48 shrink-0' : 'min-h-0 overflow-hidden'}`}>
              <RoomChat
                roomId={room.id}
                userId={user.id}
                displayName={profile?.display_name || 'Player'}
                hostId={room.host_id}
                guestId={room.guest_id}
                onIncomingMessage={() => playSound('chat')}
              />
            </div>
          </div>
        </Suspense>
      </main>
    </div>
  );
};

export default Room;
