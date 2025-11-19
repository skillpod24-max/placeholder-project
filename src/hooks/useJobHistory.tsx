import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useJobHistory = () => {
  const { user, userRole } = useAuth();

  const logJobHistory = async (
    jobId: string,
    action: string,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string,
    notes?: string
  ) => {
    if (!user || !userRole) return;

    let userName = "Unknown User";
    const role = userRole.role;

    // Fetch user name based on role
    if (role === "company") {
      userName = user.email || "Company Admin";
    } else if (role === "vendor") {
      const { data } = await supabase
        .from("vendors")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (data) userName = data.name;
    } else if (role === "worker") {
      const { data } = await supabase
        .from("workers")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (data) userName = data.name;
    }

    await supabase.from("job_order_history").insert({
      job_id: jobId,
      user_id: user.id,
      user_name: userName,
      user_role: role,
      action,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
      notes,
    });
  };

  return { logJobHistory };
};
