
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallControlsProps {
  conversationId: string;
  onCallStart?: (callId: string, callType: 'audio' | 'video') => void;
}

export const CallControls = ({ conversationId, onCallStart }: CallControlsProps) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    // Listen for active calls in this conversation
    const channel = supabase
      .channel(`call-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Call update:', payload);
          if (payload.new && payload.new.status === 'active') {
            setActiveCall(payload.new);
          } else if (payload.new && payload.new.status === 'ended') {
            setActiveCall(null);
            setIsInCall(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const startCall = async (callType: 'audio' | 'video') => {
    if (!user) return;

    try {
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      // Add caller as participant
      await supabase
        .from('call_participants')
        .insert({
          call_session_id: callSession.id,
          user_id: user.id,
        });

      setActiveCall(callSession);
      setIsInCall(true);
      onCallStart?.(callSession.id, callType);
      toast.success(`${callType === 'audio' ? 'Audio' : 'Video'} call started`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start call');
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      await supabase
        .from('call_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString() 
        })
        .eq('id', activeCall.id);

      setActiveCall(null);
      setIsInCall(false);
      toast.success('Call ended');
    } catch (error: any) {
      toast.error('Failed to end call');
    }
  };

  const joinCall = async () => {
    if (!activeCall || !user) return;

    try {
      await supabase
        .from('call_participants')
        .insert({
          call_session_id: activeCall.id,
          user_id: user.id,
        });

      setIsInCall(true);
      toast.success('Joined call');
    } catch (error: any) {
      toast.error('Failed to join call');
    }
  };

  if (activeCall && !isInCall && activeCall.caller_id !== user?.id) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Badge variant="secondary" className="bg-blue-100">
          {activeCall.call_type === 'audio' ? <Phone className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
          Incoming {activeCall.call_type} call
        </Badge>
        <Button size="sm" onClick={joinCall} className="bg-green-600 hover:bg-green-700">
          <Phone className="h-4 w-4 mr-1" />
          Join
        </Button>
        <Button size="sm" variant="destructive" onClick={endCall}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isInCall) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <Badge variant="secondary" className="bg-green-100">
          <Users className="h-3 w-3 mr-1" />
          In {activeCall?.call_type} call
        </Badge>
        <Button
          size="sm"
          variant={isMuted ? "destructive" : "outline"}
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        {activeCall?.call_type === 'video' && (
          <Button
            size="sm"
            variant={isVideoOff ? "destructive" : "outline"}
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={endCall}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => startCall('audio')}
        disabled={!!activeCall}
      >
        <Phone className="h-4 w-4 mr-1" />
        Audio Call
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => startCall('video')}
        disabled={!!activeCall}
      >
        <Video className="h-4 w-4 mr-1" />
        Video Call
      </Button>
    </div>
  );
};
