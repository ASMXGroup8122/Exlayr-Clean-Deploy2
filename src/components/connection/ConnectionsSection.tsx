import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ConnectionCard } from './ConnectionCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { connectionConfigs, ConnectionConfig } from '@/config/connectionConfigs';

// Define props for the ConnectionsSection component
interface ConnectionsSectionProps {
  // Connection status tracking
  connectionStatuses: Record<string, boolean>;
  loadingStatuses: Record<string, boolean>;
  // Connection handlers
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  // Function to render the icon for a connection
  renderIcon: (iconName: string) => React.ReactNode;
}

export function ConnectionsSection({
  connectionStatuses,
  loadingStatuses,
  onConnect,
  onDisconnect,
  renderIcon
}: ConnectionsSectionProps) {
  const [expandedSections, setExpandedSections] = useState(false);

  // Group connections by section
  const groupedConnections: Record<string, ConnectionConfig[]> = {
    social: [],
    collaboration: [],
    scheduling: [],
    email: [],
    ai: []
  };

  // Organize connections into their respective sections
  Object.values(connectionConfigs).forEach(config => {
    if (groupedConnections[config.section]) {
      groupedConnections[config.section].push(config);
    }
  });

  // Section titles and their respective icons/styles
  const sectionConfig = {
    social: { title: 'Core Platforms', iconClassName: 'text-emerald-500' },
    collaboration: { title: 'Content & Collaboration', iconClassName: 'text-blue-500' },
    scheduling: { title: 'Scheduling', iconClassName: 'text-indigo-500' },
    email: { title: 'Email & CRM', iconClassName: 'text-red-500' },
    ai: { title: 'AI & Automation', iconClassName: 'text-green-500' }
  };

  return (
    <div>
      {/* Main Social Media Section - Always Visible */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {renderIcon('checkCircle')}
          <span className="ml-2">{sectionConfig.social.title}</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {groupedConnections.social.map(config => (
            <ConnectionCard
              key={config.id}
              config={config}
              isConnected={!!connectionStatuses[config.id]}
              isConnecting={!!loadingStatuses[config.id]}
              onConnect={() => onConnect(config.id)}
              onDisconnect={() => onDisconnect(config.id)}
              renderIcon={renderIcon}
            />
          ))}
        </div>
      </div>
      
      {/* More Connections Button and Expandable Sections */}
      <div className="mt-8">
        <Collapsible 
          open={expandedSections} 
          onOpenChange={setExpandedSections}
        >
          <div className="flex justify-center mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <ChevronDown className="h-4 w-4 mr-2" />
                {expandedSections ? 'Hide Additional Connections' : 'More Connections'}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            {/* Content & Collaboration Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {renderIcon('edit')}
                <span className="ml-2">{sectionConfig.collaboration.title}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {groupedConnections.collaboration.map(config => (
                  <ConnectionCard
                    key={config.id}
                    config={config}
                    isConnected={!!connectionStatuses[config.id]}
                    isConnecting={!!loadingStatuses[config.id]}
                    onConnect={() => onConnect(config.id)}
                    onDisconnect={() => onDisconnect(config.id)}
                    renderIcon={renderIcon}
                  />
                ))}
              </div>
            </div>
            
            {/* Scheduling Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {renderIcon('calendar')}
                <span className="ml-2">{sectionConfig.scheduling.title}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {groupedConnections.scheduling.map(config => (
                  <ConnectionCard
                    key={config.id}
                    config={config}
                    isConnected={!!connectionStatuses[config.id]}
                    isConnecting={!!loadingStatuses[config.id]}
                    onConnect={() => onConnect(config.id)}
                    onDisconnect={() => onDisconnect(config.id)}
                    renderIcon={renderIcon}
                  />
                ))}
              </div>
            </div>
            
            {/* Email & CRM Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {renderIcon('mail')}
                <span className="ml-2">{sectionConfig.email.title}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {groupedConnections.email.map(config => (
                  <ConnectionCard
                    key={config.id}
                    config={config}
                    isConnected={!!connectionStatuses[config.id]}
                    isConnecting={!!loadingStatuses[config.id]}
                    onConnect={() => onConnect(config.id)}
                    onDisconnect={() => onDisconnect(config.id)}
                    renderIcon={renderIcon}
                  />
                ))}
              </div>
            </div>
            
            {/* AI & Automation Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {renderIcon('bot')}
                <span className="ml-2">{sectionConfig.ai.title}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {groupedConnections.ai.map(config => (
                  <ConnectionCard
                    key={config.id}
                    config={config}
                    isConnected={!!connectionStatuses[config.id]}
                    isConnecting={!!loadingStatuses[config.id]}
                    onConnect={() => onConnect(config.id)}
                    onDisconnect={() => onDisconnect(config.id)}
                    renderIcon={renderIcon}
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
} 