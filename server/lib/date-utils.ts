import { addMonths, addYears, addWeeks, isPast, startOfDay } from "date-fns";

/**
 * Calculates the next renewal date based on the current renewal date and billing cycle.
 * Handles multiple rollovers if the date is significantly in the past.
 */
export function calculateNextRenewalDate(currentDate: Date, cycle: string): Date {
    const now = startOfDay(new Date());
    let nextDate = new Date(currentDate);

    // If the date is already in the future, don't change it
    if (!isPast(nextDate) || nextDate.getTime() === now.getTime()) {
        // We only want to roll over if it's strictly in the past of "today"
        // However, usually we might want to roll over even if it's "today" depending on policy.
        // Let's stick to isPast(nextDate) which uses current timestamp.
    }

    const cycleLower = cycle.toLowerCase().trim();

    // Basic guard against infinite loops and invalid cycles
    if (!["monthly", "yearly", "weekly"].includes(cycleLower)) {
        return currentDate;
    }

    // Roll over until we hit a date that is NOT in the past
    while (isPast(nextDate)) {
        if (cycleLower === "monthly") {
            nextDate = addMonths(nextDate, 1);
        } else if (cycleLower === "yearly") {
            nextDate = addYears(nextDate, 1);
        } else if (cycleLower === "weekly") {
            nextDate = addWeeks(nextDate, 1);
        }
    }

    return nextDate;
}
