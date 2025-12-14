import { RenewalsWidget } from "../RenewalsWidget";
import { mockTools, getUpcomingRenewals } from "@/lib/mockData";

export default function RenewalsWidgetExample() {
  const renewals = getUpcomingRenewals(mockTools, 30);
  
  return (
    <div className="p-4 max-w-md">
      <RenewalsWidget
        renewals={renewals}
        onViewAll={() => console.log("View all renewals")}
      />
    </div>
  );
}



