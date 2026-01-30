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
        const token = localStorage.getItem("token");

        // Call our backend to create a valid, signed checkout session
        // We use the backend SDK because manual URLs are prone to 404s
        const response = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                productPriceId,
            }),
        });

        if (response.status === 401) {
            // If not logged in, redirect to signup
            window.location.href = '/signup';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to create checkout session');
        }

        const { url } = data;

        console.log('[Polar] Redirecting to session URL:', url);

        // Redirect to Polar checkout
        window.location.href = url;

    } catch (error: any) {
        console.error('[Polar] Checkout error:', error);
        alert(`Billing Error: ${error.message}`);
    }
}

/**
 * Get customer portal URL for managing subscriptions
 */
export function getPolarCustomerPortalUrl(): string {
    const POLAR_ORGANIZATION_SLUG = import.meta.env.VITE_POLAR_ORGANIZATION_SLUG;
    const baseUrl = POLAR_ENV === 'sandbox'
        ? 'https://sandbox.polar.sh'
        : 'https://polar.sh';

    if (!POLAR_ORGANIZATION_SLUG) {
        // Fallback to ID-based if slug is missing
        if (!POLAR_ORGANIZATION_ID) return baseUrl;
        return `${baseUrl}/customer-portal/${POLAR_ORGANIZATION_ID}`;
    }

    return `${baseUrl}/${POLAR_ORGANIZATION_SLUG}/portal`;
}

// Export configuration for use in other modules
export const polarConfig = {
    organizationId: POLAR_ORGANIZATION_ID,
    environment: POLAR_ENV,
};
