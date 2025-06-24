
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

interface UserSearchProps {
  onUserSelect: (user: User) => void;
  placeholder?: string;
}

export const UserSearch = ({ onUserSelect, placeholder = "Search users by username..." }: UserSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['userSearch', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const { data, error } = await supabase.rpc('search_users_by_username', {
        search_term: searchTerm.trim()
      });

      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchTerm.length >= 2 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            searchResults.map((user: User) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => onUserSelect(user)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : searchTerm.length >= 2 ? (
            <div className="text-center py-4 text-muted-foreground">
              No users found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
