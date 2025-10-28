// Компонент для вкладки "Чат"
import { Suspense } from 'react';
import { EventChat, ChatLoadingFallback } from './LazyComponents';

const EventDetailsChat = ({ eventId }) => {
  return (
    <div className="event-chat-tab">
      <Suspense fallback={<ChatLoadingFallback />}>
        <EventChat eventId={eventId} />
      </Suspense>
    </div>
  );
};

export default EventDetailsChat;
