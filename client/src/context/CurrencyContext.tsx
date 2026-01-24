import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "@/lib/queryClient";

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number | string | null | undefined) => string;
  currencies: Currency[];
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);

  // Load currency preference from user settings or localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem("currency");
    if (savedCurrency) {
      const found = CURRENCIES.find(c => c.code === savedCurrency);
      if (found) {
        setCurrencyState(found);
      }
    } else if (user?.currency) {
      const found = CURRENCIES.find(c => c.code === user.currency);
      if (found) {
        setCurrencyState(found);
      }
    }
  }, [user]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("currency", newCurrency.code);
    
    // Update user preference in database if logged in
    if (user) {
      try {
        await apiRequest("PATCH", "/api/auth/profile", { currency: newCurrency.code });
        const updatedUser = { ...user, currency: newCurrency.code };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } catch (_error) {
        console.error("Failed to update currency preference:", _error);
      }
    }
  };

  const formatAmount = (amount: number | string | null | undefined): string => {
    if (amount === null || amount === undefined || amount === "") {
      return "N/A";
    }
    
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return "N/A";
    }

    // Format based on currency
    if (currency.code === "JPY" || currency.code === "CNY") {
      // No decimal places for these currencies
      return `${currency.symbol}${numAmount.toFixed(0)}`;
    }
    
    return `${currency.symbol}${numAmount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}









