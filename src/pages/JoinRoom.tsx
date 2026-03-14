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
      navigate(`/auth?redirect=/join/${code}`);
      return;
    }
    if (!code || joining) return;

    const joinRoom = async () => {
      setJoining(true);
      const { data: roomId, error } = await supabase
        .rpc('join_room', { p_room_code: code! });

      if (error || !roomId) {
        toast.error('Room not found or already full');
        navigate('/lobby');
        return;
      }

      navigate(`/room/${roomId}`);
    };

    joinRoom();
  }, [user, loading, code, navigate, joining]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Joining room...</p>
      </div>
    </div>
  );
};

export default JoinRoom;
