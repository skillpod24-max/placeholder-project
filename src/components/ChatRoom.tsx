import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface ChatRoomProps {
  roomId: string;
  entityType: string;
  entityId: string;
  title: string;
}

export const ChatRoom = ({ roomId, entityType, entityId, title }: ChatRoomProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [senderName, setSenderName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && userRole) {
      fetchSenderName();
      fetchMessages();
      subscribeToMessages();
    }
  }, [user, userRole, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSenderName = async () => {
    if (!user || !userRole) return;

    if (userRole.role === "vendor") {
      const { data } = await supabase
        .from("vendors")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (data) setSenderName(data.name);
    } else if (userRole.role === "worker") {
      const { data } = await supabase
        .from("workers")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (data) setSenderName(data.name);
    } else {
      setSenderName(user.email || "Company Admin");
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userRole) return;

    setLoading(true);

    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: user.id,
      sender_name: senderName,
      sender_role: userRole.role,
      message: newMessage.trim(),
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "company": return "bg-primary";
      case "vendor": return "bg-secondary";
      case "worker": return "bg-accent";
      default: return "bg-muted";
    }
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender_id === user?.id ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className={`h-8 w-8 ${getRoleColor(msg.sender_role)}`}>
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col ${
                      msg.sender_id === user?.id ? "items-end" : "items-start"
                    } max-w-[70%]`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.sender_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
