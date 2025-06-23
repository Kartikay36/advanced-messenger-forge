
import { MessageCircle, Users, Shield, Zap } from 'lucide-react';

export const EmptyChat = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-900/50 dark:to-gray-800/50">
      <div className="text-center max-w-md px-6">
        <div className="bg-blue-600 text-white p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center mx-auto">
          <MessageCircle className="h-12 w-12" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Welcome to SecureChat</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Select a conversation from the sidebar to start messaging, or create a new chat to begin connecting with others.
        </p>

        <div className="grid grid-cols-1 gap-4 text-left">
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-medium">End-to-End Encryption</h4>
              <p className="text-sm text-muted-foreground">All messages are secured with advanced encryption</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium">Real-time Messaging</h4>
              <p className="text-sm text-muted-foreground">Instant delivery and real-time updates</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium">Group Conversations</h4>
              <p className="text-sm text-muted-foreground">Create groups and collaborate with teams</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
