import { MessageSquare, GitPullRequest, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Interaction {
  id: string;
  type: 'comment' | 'revision' | 'approval' | 'rejection';
  content: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
  version: number;
}

interface InteractionTimelineProps {
  interactions: Interaction[];
}

export default function InteractionTimeline({ interactions }: InteractionTimelineProps) {
  const getIcon = (type: Interaction['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="w-3 h-3 text-gray-500" />;
      case 'revision':
        return <GitPullRequest className="w-3 h-3 text-blue-500" />;
      case 'approval':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'rejection':
        return <XCircle className="w-3 h-3 text-red-500" />;
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-2">
        No interactions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {interactions.map((interaction) => (
        <div key={interaction.id} className="flex gap-2 items-start text-sm">
          <div className="mt-1">{getIcon(interaction.type)}</div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-medium">{interaction.user.name}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{interaction.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 
