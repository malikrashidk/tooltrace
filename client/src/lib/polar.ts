/**
 * Polar.sh Frontend Integration
 * 
 * Provides checkout and payment functionality using Polar's standard checkout flow
 * Docs: https://docs.polar.sh/merchants/checkout
 */

// Get Polar configuration from environment
const POLAR_ORGANIZATION_ID = import.meta.env.VITE_POLAR_ORGANIZATION_ID;
const POLAR_ENV = import.meta.env.VITE_POLAR_ENV || 'production';

/**
 * Opens Polar checkout by redirecting to Polar's hosted checkout page
 * 
 * @param productPriceId - The Polar product price ID (from your Polar dashboard)
 * @param email - Optional user email to pre-fill
 * @param userId - Optional user ID to pass as custom data
 * @param successUrl - Optional success redirect URL
 */
export async function openPolarCheckout({
    productPriceId,
    email,
    userId,
    successUrl,
}: {
    productPriceId: string;
    email?: string;
    userId?: string;
    successUrl?: string;
}) {
    if (!POLAR_ORGANIZATION_ID) {
        console.error('[Polar] VITE_POLAR_ORGANIZATION_ID not configured');
        alert('Payment system not configured. Please contact support.');
        return;
    }

    try {
        // Use organization slug if available, otherwise fallback to ID
        // Note: Using a direct URL is more reliable if session cookies are restricted
        const orgIdentifier = import.meta.env.VITE_POLAR_ORGANIZATION_SLUG || POLAR_ORGANIZATION_ID;

        const baseUrl = POLAR_ENV === 'sandbox'
            ? `https://sandbox.polar.sh/${orgIdentifier}`
            : `https://polar.sh/${orgIdentifier}`;

        const checkoutUrl = new URL(`${baseUrl}/checkout`);

        // Add product price ID (Polar uses priceId camelCase)
        checkoutUrl.searchParams.set('priceId', productPriceId);

        // Add user email if available
        if (email) {
            checkoutUrl.searchParams.set('customer_email', email);
        }

        // Add metadata
        if (userId) {
            checkoutUrl.searchParams.set('metadata[userId]', userId);
        }

        // Default success URL
        checkoutUrl.searchParams.set('success_url', `${window.location.origin}/dashboard?checkout=success`);

        console.log('[Polar] Redirecting to direct checkout:', checkoutUrl.toString());

        // Redirect to Polar checkout
        window.location.href = checkoutUrl.toString();

    } catch (error: any) {
        console.error('[Polar] Checkout error:', error);
        alert(`Billing Error: ${error.message}`);
    }
}

/**
 * Get customer portal URL for managing subscriptions
 */
export function getPolarCustomerPortalUrl(): string {
    const baseUrl = POLAR_ENV === 'sandbox'
        ? 'https://sandbox.polar.sh'
        : 'https://polar.sh';

    return `${baseUrl}/customer-portal/${POLAR_ORGANIZATION_ID}`;
}

// Export configuration for use in other modules
export const polarConfig = {
    organizationId: POLAR_ORGANIZATION_ID,
    environment: POLAR_ENV,
};
