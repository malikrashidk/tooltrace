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
        // Call our backend to create a valid, signed checkout session
        // This avoids 404s by using the official Polar SDK on the server
        const response = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productPriceId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create checkout session');
        }

        const { url } = await response.json();

        console.log('[Polar] Redirecting to checkout session:', url);

        // Redirect to Polar checkout
        window.location.href = url;

    } catch (error: any) {
        console.error('[Polar] Checkout error:', error);
        alert(`Failed to open checkout: ${error.message}`);
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
