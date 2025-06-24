
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JoinGroupDialogProps {
  onGroupJoined: (conversationId: string) => void;
}

interface JoinGroupResponse {
  success: boolean;
  conversation_id?: string;
  error?: string;
}

export const JoinGroupDialog = ({ onGroupJoined }: JoinGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const joinGroupByCode = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_group_by_code', {
        invite_code: inviteCode.trim()
      });

      if (error) throw error;

      const result = data as JoinGroupResponse;
      if (result.success) {
        toast.success('Successfully joined group!');
        if (result.conversation_id) {
          onGroupJoined(result.conversation_id);
        }
        setOpen(false);
        setInviteCode('');
      } else {
        toast.error(result.error || 'Failed to join group');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Link className="h-4 w-4 mr-2" />
          Join Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Group Invite Code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter 8-character invite code"
              maxLength={8}
            />
          </div>
          <Button onClick={joinGroupByCode} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Group'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
