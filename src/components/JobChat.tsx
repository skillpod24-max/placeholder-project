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
      <div className="flex h-[600px] border rounded-lg">
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a chat room from the sidebar to start messaging
        </div>
        <ChatRoomSelector
          jobId={jobId}
          onRoomSelect={handleRoomSelect}
          currentRoomId={roomId || undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg">
      <div className="flex-1">
        <ChatRoom
          roomId={roomId}
          entityType="job"
          entityId={jobId}
          title={roomName || `Job Chat: ${jobTitle}`}
        />
      </div>
      <ChatRoomSelector
        jobId={jobId}
        onRoomSelect={handleRoomSelect}
        currentRoomId={roomId}
      />
    </div>
  );
};
