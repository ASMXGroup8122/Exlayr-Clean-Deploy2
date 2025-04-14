'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data - would be replaced with API calls to fetch and store events
const mockCampaignEvents = {
  'c0d082bf-6b79-46c8-8d16-c19453c09f41': [
    {
      id: '1',
      title: 'Email Blast - Series A',
      start: '2023-11-15T10:00:00',
      end: '2023-11-15T11:00:00',
      backgroundColor: '#4285F4',
      borderColor: '#4285F4',
      extendedProps: {
        type: 'email',
        status: 'scheduled'
      }
    },
    {
      id: '2',
      title: 'Social Media Post - Q3 Results',
      start: '2023-11-17T14:00:00',
      end: '2023-11-17T15:00:00',
      backgroundColor: '#34A853',
      borderColor: '#34A853',
      extendedProps: {
        type: 'social',
        status: 'draft'
      }
    }
  ]
};

// Define event types and their colors
const eventTypes = [
  { value: 'email', label: 'Email Campaign', color: '#4285F4' },
  { value: 'social', label: 'Social Media', color: '#34A853' },
  { value: 'webinar', label: 'Webinar', color: '#FBBC05' },
  { value: 'press', label: 'Press Release', color: '#EA4335' }
];

interface CampaignSchedulerProps {
  orgId: string;
}

export function CampaignScheduler({ orgId }: CampaignSchedulerProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('email');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Load events specific to this user/org
  useEffect(() => {
    // In a real implementation, this would be an API call to fetch events for this org
    const userEvents = mockCampaignEvents[orgId as keyof typeof mockCampaignEvents] || [];
    setEvents(userEvents);
  }, [orgId]);

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.start);
    setEventTitle('');
    setEventType('email');
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setEventTitle(clickInfo.event.title);
    setEventType(clickInfo.event.extendedProps.type);
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!eventTitle.trim()) return;

    const eventColor = eventTypes.find(type => type.value === eventType)?.color || '#4285F4';

    if (selectedEvent) {
      // Update existing event
      const updatedEvents = events.map(event => 
        event.id === selectedEvent.id 
          ? {
              ...event,
              title: eventTitle,
              backgroundColor: eventColor,
              borderColor: eventColor,
              extendedProps: {
                ...event.extendedProps,
                type: eventType
              }
            }
          : event
      );
      setEvents(updatedEvents);
    } else if (selectedDate) {
      // Create new event
      const endDate = new Date(selectedDate);
      endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration

      const newEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: selectedDate.toISOString(),
        end: endDate.toISOString(),
        backgroundColor: eventColor,
        borderColor: eventColor,
        extendedProps: {
          type: eventType,
          status: 'draft'
        }
      };
      setEvents([...events, newEvent]);
    }

    // In a real app, save to database here
    setShowEventModal(false);
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      const updatedEvents = events.filter(event => event.id !== selectedEvent.id);
      setEvents(updatedEvents);
      // In a real app, delete from database here
    }
    setShowEventModal(false);
  };

  return (
    <div className="h-full">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-[#DADCE0]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          aspectRatio={1.8}
        />
      </div>

      {/* Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Campaign Event' : 'New Campaign Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="E.g., Email Campaign - Q4 Update"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: type.color }}></div>
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <div className="text-sm text-gray-500">
                {selectedDate ? selectedDate.toLocaleString() : 'Select a date and time'}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {selectedEvent && (
              <Button variant="destructive" onClick={handleDeleteEvent} type="button">
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEventModal(false)} type="button">
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} type="button">
                {selectedEvent ? 'Update' : 'Create'} Event
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 