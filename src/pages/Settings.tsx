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
  const [timezone, setTimezone] = useState("UTC");
  const [industryType, setIndustryType] = useState<string>("general");
  const { toast } = useToast();

  useEffect(() => {
    if (user && userRole) {
      fetchProfileInfo();
    }
  }, [user, userRole]);

  const fetchProfileInfo = async () => {
    if (!user || !userRole) return;

    // Get company name and industry type
    const { data: companyData } = await supabase
      .from("companies")
      .select("name, industry_type")
      .eq("id", userRole.company_id)
      .single();
    
    if (companyData?.industry_type) {
      setIndustryType(companyData.industry_type);
    }

    let name = user.email || "";
    let vendorName = "";
    let teamName = "";

    // Get role-specific info and timezone
    if (userRole.role === "vendor") {
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("name, timezone")
        .eq("user_id", user.id)
        .eq("company_id", userRole.company_id)
        .single();
      
      if (vendorData) {
        name = vendorData.name;
        setTimezone(vendorData.timezone || "UTC");
      }
    } else if (userRole.role === "worker") {
      const { data: workerData } = await supabase
        .from("workers")
        .select("name, vendor_id, team_role, timezone")
        .eq("user_id", user.id)
        .eq("company_id", userRole.company_id)
        .single();
      
      if (workerData) {
        name = workerData.name;
        setTimezone(workerData.timezone || "UTC");

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

  const handleTimezoneUpdate = async () => {
    if (!user || !userRole) return;

    setLoading(true);

    const table = userRole.role === "vendor" ? "vendors" : "workers";
    const { error } = await supabase
      .from(table)
      .update({ timezone })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error updating timezone",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Timezone updated successfully",
    });
  };

  const handleIndustryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole?.company_id) return;

    setLoading(true);
    const { error } = await supabase
      .from("companies")
      .update({ industry_type: industryType })
      .eq("id", userRole.company_id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error updating industry type",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Industry type updated successfully",
    });
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

      {/* Industry Type Settings - Only for Company Admin */}
      {userRole?.role === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>Industry Type</CardTitle>
            <CardDescription>Customize your workspace based on your industry</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIndustryUpdate} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="general">General</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="it">Information Technology</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  Select your industry to unlock specialized features and workflows
                </p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Industry"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(userRole?.role === "vendor" || userRole?.role === "worker") && (
        <Card>
          <CardHeader>
            <CardTitle>Timezone Settings</CardTitle>
            <CardDescription>Set your local timezone for accurate time display</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="timezone">Your Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Shanghai">China (CST)</option>
                  <option value="Asia/Tokyo">Japan (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEDT)</option>
                </select>
              </div>
              <Button onClick={handleTimezoneUpdate} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Timezone
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
