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
        // Construct the Polar checkout URL
        const baseUrl = POLAR_ENV === 'sandbox'
            ? 'https://sandbox.polar.sh'
            : 'https://polar.sh';

        // Build checkout URL with parameters
        const checkoutUrl = new URL(`${baseUrl}/checkout/${POLAR_ORGANIZATION_ID}`);

        // Add product price ID
        checkoutUrl.searchParams.set('price_id', productPriceId);

        // Add optional parameters
        if (email) {
            checkoutUrl.searchParams.set('email', email);
        }

        if (userId) {
            // Polar supports custom metadata
            checkoutUrl.searchParams.set('metadata[userId]', userId);
        }

        if (successUrl) {
            checkoutUrl.searchParams.set('success_url', successUrl);
        } else {
            // Default success URL
            checkoutUrl.searchParams.set('success_url', `${window.location.origin}/dashboard?checkout=success`);
        }

        console.log('[Polar] Redirecting to checkout:', {
            productPriceId,
            email,
            userId,
            env: POLAR_ENV,
        });

        // Redirect to Polar checkout
        window.location.href = checkoutUrl.toString();

    } catch (error) {
        console.error('[Polar] Checkout error:', error);
        alert('Failed to open checkout. Please try again or contact support.');
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
