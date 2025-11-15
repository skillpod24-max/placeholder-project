import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Briefcase, Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";

interface ProfileInfo {
  email: string;
  name: string;
  role: string;
  companyName: string;
  vendorName?: string;
  teamName?: string;
}

const Settings = () => {
  const { user, userRole } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && userRole) {
      fetchProfileInfo();
    }
  }, [user, userRole]);

  const fetchProfileInfo = async () => {
    if (!user || !userRole) return;

    // Get company name
    const { data: companyData } = await supabase
      .from("companies")
      .select("name")
      .eq("id", userRole.company_id)
      .single();

    let name = user.email || "";
    let vendorName = "";
    let teamName = "";

    // Get role-specific info
    if (userRole.role === "vendor") {
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("name")
        .eq("user_id", user.id)
        .eq("company_id", userRole.company_id)
        .single();
      
      if (vendorData) {
        name = vendorData.name;
      }
    } else if (userRole.role === "worker") {
      const { data: workerData } = await supabase
        .from("workers")
        .select("name, vendor_id, team_role")
        .eq("user_id", user.id)
        .eq("company_id", userRole.company_id)
        .single();
      
      if (workerData) {
        name = workerData.name;

        // Get vendor name if exists
        if (workerData.vendor_id) {
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("name")
            .eq("id", workerData.vendor_id)
            .single();
          if (vendorData) vendorName = vendorData.name;
        }

        // Get team info
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("team_id, teams(name)")
          .eq("worker_id", workerData.vendor_id ? null : user.id)
          .single();

        if (teamMember?.teams) {
          teamName = (teamMember.teams as any).name;
        }
      }
    }

    setProfileInfo({
      email: user.email || "",
      name,
      role: userRole.role,
      companyName: companyData?.name || "",
      vendorName,
      teamName,
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Profile</CardTitle>
          <CardDescription>Your account information and role details</CardDescription>
        </CardHeader>
        <CardContent>
          {profileInfo ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{profileInfo.name}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profileInfo.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-sm text-muted-foreground capitalize">{profileInfo.role}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">{profileInfo.companyName}</p>
                </div>
              </div>
              
              {profileInfo.vendorName && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Vendor</p>
                      <p className="text-sm text-muted-foreground">{profileInfo.vendorName}</p>
                    </div>
                  </div>
                </>
              )}
              
              {profileInfo.teamName && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Team</p>
                      <p className="text-sm text-muted-foreground">{profileInfo.teamName}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
