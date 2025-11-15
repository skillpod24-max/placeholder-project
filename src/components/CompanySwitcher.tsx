import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
}

interface CompanySwitcherProps {
  vendorId: string;
  currentCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

export const CompanySwitcher = ({ vendorId, currentCompanyId, onCompanyChange }: CompanySwitcherProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorCompanies();
  }, [vendorId]);

  const fetchVendorCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("vendor_companies")
        .select("company_id, companies(id, name)")
        .eq("vendor_id", vendorId)
        .eq("is_active", true);

      if (error) throw error;

      if (data) {
        const companyList = data
          .map((vc: any) => vc.companies)
          .filter((c: any) => c !== null) as Company[];
        setCompanies(companyList);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching companies",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (companies.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-card">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={currentCompanyId} onValueChange={onCompanyChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
