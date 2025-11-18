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
    // Fetch all users related to this job (company, vendor, workers)
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
    if (!user || !userRole) return;

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
        roomName = `Chat with ${targetUser?.name}`;
        // For private rooms, include both user IDs in the name for uniqueness
        existingRoomFilter.name = roomName;
        break;
    }

    // Check if room exists
    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("*")
      .match(existingRoomFilter)
      .single();

    if (existingRoom) {
      // Join existing room
      await supabase.from("chat_participants").upsert({
        room_id: existingRoom.id,
        user_id: user.id,
      });
      onRoomSelect(existingRoom.id, roomType, roomName);
      return;
    }

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

    if (error || !newRoom) return;

    // Add participants
    const participants = [{ room_id: newRoom.id, user_id: user.id }];
    
    if (roomType === "private" && targetUserId) {
      participants.push({ room_id: newRoom.id, user_id: targetUserId });
    }

    await supabase.from("chat_participants").insert(participants);
    
    onRoomSelect(newRoom.id, roomType, roomName);
    fetchRooms();
  };

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case "public":
        return <Users className="h-4 w-4" />;
      case "vendor_workers":
        return <Building2 className="h-4 w-4" />;
      case "private":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-64 border-l bg-muted/30 p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-3">Chat Rooms</h3>
        
        <div className="space-y-2 mb-4">
          <Button
            variant={currentRoomId && rooms.find(r => r.id === currentRoomId)?.room_type === "public" ? "default" : "outline"}
            size="sm"
            className="w-full justify-start"
            onClick={() => createOrJoinRoom("public")}
          >
            <Users className="h-4 w-4 mr-2" />
            Public Discussion
          </Button>

          {userRole?.role === "vendor" && (
            <Button
              variant={currentRoomId && rooms.find(r => r.id === currentRoomId)?.room_type === "vendor_workers" ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => createOrJoinRoom("vendor_workers")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Vendor Team
            </Button>
          )}
        </div>
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
          <ScrollArea className="h-48">
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
          </ScrollArea>
        </div>
      )}
    </div>
  );
};