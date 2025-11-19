import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChatRoom } from "./ChatRoom";

interface JobChatProps {
  jobId: string;
  jobTitle: string;
}

import { ChatRoomSelector } from "./ChatRoomSelector";

export const JobChat = ({ jobId, jobTitle }: JobChatProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("");
  const [roomType, setRoomType] = useState<string>("public");

  const handleRoomSelect = (selectedRoomId: string, selectedType: string, selectedName: string) => {
    setRoomId(selectedRoomId);
    setRoomType(selectedType);
    setRoomName(selectedName);
  };

  if (!roomId) {
    return (
      <div className="flex h-[600px] border rounded-lg overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
          Select a chat room from the sidebar to start messaging
        </div>
        <div className="w-80 border-l bg-background">
          <ChatRoomSelector
            jobId={jobId}
            onRoomSelect={handleRoomSelect}
            currentRoomId={roomId || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      <div className="flex-1 min-w-0">
        <ChatRoom
          roomId={roomId}
          entityType="job"
          entityId={jobId}
          title={roomName || `Job Chat: ${jobTitle}`}
        />
      </div>
      <div className="w-80 border-l bg-background flex-shrink-0">
        <ChatRoomSelector
          jobId={jobId}
          onRoomSelect={handleRoomSelect}
          currentRoomId={roomId}
        />
      </div>
    </div>
  );
};
