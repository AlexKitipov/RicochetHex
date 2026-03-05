import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const JoinRoom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Redirect to auth, then come back
      navigate(`/auth?redirect=/join/${code}`);
      return;
    }
    if (!code || joining) return;

    const joinRoom = async () => {
      setJoining(true);
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', code.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (error || !room) {
        toast.error('Стаята не е намерена или вече е заета');
        navigate('/lobby');
        return;
      }

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ guest_id: user.id, status: 'playing' })
        .eq('id', (room as any).id);

      if (updateError) {
        toast.error('Грешка при присъединяване');
        navigate('/lobby');
        return;
      }

      navigate(`/room/${(room as any).id}`);
    };

    joinRoom();
  }, [user, loading, code, navigate, joining]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Присъединяване към стая...</p>
      </div>
    </div>
  );
};

export default JoinRoom;
