import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Trash2 } from 'lucide-react';
import { ConnectionConfig } from '@/config/connectionConfigs';

// Default component props
interface ConnectionCardProps {
  config: ConnectionConfig;
  isConnected?: boolean;
  isConnecting?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  renderIcon?: (iconName: string) => React.ReactNode;
}

// ConnectionCard matches the exact styling and structure of the existing cards
export function ConnectionCard({ 
  config,
  isConnected = false,
  isConnecting = false,
  onConnect,
  onDisconnect,
  renderIcon
}: ConnectionCardProps) {
  const { 
    title, 
    description, 
    icon,
    isComingSoon,
    badgeText
  } = config;

  return (
    <Card className={cn(
      "overflow-hidden hover:shadow-md transition-shadow", 
      isComingSoon && "bg-gray-100 opacity-75"
    )}>
      <CardHeader className="pb-2 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {renderIcon && renderIcon(icon)}
            <CardTitle className="text-lg">
              {title}
              {badgeText && (
                <span className="ml-2 text-xs text-gray-500">{badgeText}</span>
              )}
            </CardTitle>
          </div>
          {isConnected && !isComingSoon && (
            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Connected
            </Badge>
          )}
          {isComingSoon && (
            <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">
              Coming Soon
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2 px-4 sm:px-6">
        <p className="text-sm text-gray-600">
          {description}
        </p>
        {isConnected && !isComingSoon && (
          <p className="text-xs text-green-600 mt-1.5">
            <CheckCircle className="h-3 w-3 inline mr-1" />
            Ready to publish posts
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end pt-3 border-t">
        {isConnecting && !isConnected && !isComingSoon && (
          <div className="mr-3 flex items-center text-gray-500">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
            <span className="text-sm">Processing...</span>
          </div>
        )}
        <Button 
          variant={isConnected && !isComingSoon ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-10 rounded-md",
            isComingSoon 
              ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed" 
              : isConnected
                ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                : "bg-blue-600 hover:bg-blue-700"
          )}
          onClick={isConnected && !isComingSoon ? onDisconnect : onConnect}
          disabled={isComingSoon || isConnecting}
        >
          {isComingSoon ? (
            "Coming Soon"
          ) : isConnected ? (
            isConnecting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" />
                <span>Disconnect</span>
              </>
            )
          ) : (
            isConnecting ? 'Connecting...' : 'Connect Account'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 
