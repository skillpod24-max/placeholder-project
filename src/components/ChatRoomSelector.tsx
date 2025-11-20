import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, User, Building2, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ChatRoomSelectorProps {
  jobId: string;
  onRoomSelect: (roomId: string, roomType: string, roomName: string) => void;
  currentRoomId?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  entity_id: string;
  participant_count?: number;
}

interface User {
  id: string;
  name: string;
  role: string;
  user_id: string;
}

export const ChatRoomSelector = ({ jobId, onRoomSelect, currentRoomId }: ChatRoomSelectorProps) => {
  const { user, userRole } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (user && userRole && jobId) {
      fetchRooms();
      fetchJobUsers();
    }
  }, [user, userRole, jobId]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("entity_id", jobId)
      .eq("entity_type", "job");

    if (data) {
      setRooms(data);
    }
  };

  const fetchJobUsers = async () => {
    const { data: job } = await supabase
      .from("jobs")
      .select("*, assigned_to_vendor_id")
      .eq("id", jobId)
      .single();

    if (!job) return;

    const usersList: User[] = [];

    // Get vendor
    if (job.assigned_to_vendor_id) {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, name, user_id")
        .eq("id", job.assigned_to_vendor_id)
        .single();

      if (vendor && vendor.user_id !== user?.id) {
        usersList.push({
          id: vendor.id,
          name: vendor.name,
          role: "vendor",
          user_id: vendor.user_id,
        });
      }
    }

    // Get workers
    const { data: jobTasks } = await supabase
      .from("job_tasks")
      .select("assigned_to_worker_id, workers!inner(id, name, user_id)")
      .eq("job_id", jobId)
      .not("assigned_to_worker_id", "is", null);

    if (jobTasks) {
      jobTasks.forEach((task: any) => {
        if (task.workers && task.workers.user_id !== user?.id) {
          const exists = usersList.find(u => u.user_id === task.workers.user_id);
          if (!exists) {
            usersList.push({
              id: task.workers.id,
              name: task.workers.name,
              role: "worker",
              user_id: task.workers.user_id,
            });
          }
        }
      });
    }

    setUsers(usersList);
  };

  const createOrJoinRoom = async (roomType: string, targetUserId?: string) => {
    if (!user || !userRole) {
      console.error("User or userRole not available");
      return;
    }

    let roomName = "";
    let existingRoomFilter: any = {
      entity_type: "job",
      entity_id: jobId,
      room_type: roomType,
    };

    switch (roomType) {
      case "public":
        roomName = "Public Discussion";
        break;
      case "vendor_workers":
        roomName = "Vendor Team Chat";
        break;
      case "private":
        if (!targetUserId) return;
        const targetUser = users.find(u => u.user_id === targetUserId);
        if (!targetUser) return;
        roomName = `Chat with ${targetUser.name}`;
        break;
    }

    // Check if room already exists
    const { data: existingRooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .match(existingRoomFilter);

    let roomId: string;

    if (existingRooms && existingRooms.length > 0) {
      roomId = existingRooms[0].id;
    } else {
      // Create new room
      const { data: newRoom, error } = await supabase
        .from("chat_rooms")
        .insert({
          entity_type: "job",
          entity_id: jobId,
          room_type: roomType,
          name: roomName,
          company_id: userRole.company_id,
        })
        .select()
        .single();

      if (error || !newRoom) {
        console.error("Error creating room:", error);
        return;
      }

      roomId = newRoom.id;
    }

    // Join room as participant
    const { data: existingParticipant } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!existingParticipant) {
      await supabase.from("chat_participants").insert({
        room_id: roomId,
        user_id: user.id,
      });
    }

    // If private room, add target user
    if (roomType === "private" && targetUserId) {
      const { data: targetParticipant } = await supabase
        .from("chat_participants")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", targetUserId)
        .single();

      if (!targetParticipant) {
        await supabase.from("chat_participants").insert({
          room_id: roomId,
          user_id: targetUserId,
        });
      }
    }

    fetchRooms();
    onRoomSelect(roomId, roomType, roomName);
  };

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case "public":
        return <Building2 className="h-4 w-4" />;
      case "vendor_workers":
        return <Users className="h-4 w-4" />;
      case "private":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat Rooms
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Public Chat</Label>
            <Button
              size="sm"
              variant={currentRoomId && rooms.find(r => r.id === currentRoomId)?.room_type === "public" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => createOrJoinRoom("public")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Public Discussion
            </Button>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Team Chat</Label>
            <Button
              size="sm"
              variant={currentRoomId && rooms.find(r => r.id === currentRoomId)?.room_type === "vendor_workers" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => createOrJoinRoom("vendor_workers")}
            >
              <Users className="h-4 w-4 mr-2" />
              Vendor Team
            </Button>
          </div>

          {users.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Direct Message</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {u.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full mt-2"
                disabled={!selectedUserId}
                onClick={() => selectedUserId && createOrJoinRoom("private", selectedUserId)}
              >
                <User className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            </div>
          )}

          {rooms.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Recent Rooms</h4>
              <div className="space-y-1">
                {rooms.map((room) => (
                  <Button
                    key={room.id}
                    variant={currentRoomId === room.id ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => onRoomSelect(room.id, room.room_type, room.name || "Chat")}
                  >
                    {getRoomIcon(room.room_type)}
                    <span className="ml-2 truncate">{room.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
