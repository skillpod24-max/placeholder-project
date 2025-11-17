import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChatRoom } from "./ChatRoom";

interface JobChatProps {
  jobId: string;
  jobTitle: string;
}

export const JobChat = ({ jobId, jobTitle }: JobChatProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (user && userRole && jobId) {
      initializeChatRoom();
    }
  }, [user, userRole, jobId]);

  const initializeChatRoom = async () => {
    if (!user || !userRole || !jobId) return;

    // Check if chat room exists
    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("entity_type", "job")
      .eq("entity_id", jobId)
      .single();

    if (existingRoom) {
      setRoomId(existingRoom.id);
      // Add user as participant if not already
      await supabase.from("chat_participants").insert({
        room_id: existingRoom.id,
        user_id: user.id,
      }).select().single();
      return;
    }

    // Create new chat room
    const { data: newRoom, error } = await supabase
      .from("chat_rooms")
      .insert({
        entity_type: "job",
        entity_id: jobId,
        name: `Chat: ${jobTitle}`,
        company_id: userRole.company_id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating chat room",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (newRoom) {
      setRoomId(newRoom.id);
      // Add creator as participant
      await supabase.from("chat_participants").insert({
        room_id: newRoom.id,
        user_id: user.id,
      });
    }
  };

  if (!roomId) {
    return <div>Loading chat...</div>;
  }

  return (
    <ChatRoom
      roomId={roomId}
      entityType="job"
      entityId={jobId}
      title={`Job Chat: ${jobTitle}`}
    />
  );
};
