import { StatsCards } from "../StatsCards";

export default function StatsCardsExample() {
  return (
    <div className="p-4">
      <StatsCards
        monthlySpend={171}
        yearlySpend={2316}
        totalTools={12}
        paidTools={10}
        freeTools={2}
        lowUsageCount={2}
      />
    </div>
  );
}



