/**
 * Polar.sh Frontend Integration
 * 
 * Provides checkout and payment functionality using Polar's Embedded Checkout
 * Docs: https://docs.polar.sh/merchants/checkout
 */

declare global {
    interface Window {
        PolarCheckout?: any;
    }
}

// Get Polar configuration from environment
const POLAR_ORGANIZATION_ID = import.meta.env.VITE_POLAR_ORGANIZATION_ID;
const POLAR_ENV = import.meta.env.VITE_POLAR_ENV || 'production';

/**
 * Opens a Polar checkout for a specific product/price
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
    onSuccess,
}: {
    productPriceId: string;
    email?: string;
    userId?: string;
    successUrl?: string;
    onSuccess?: (order: any) => void;
}) {
    if (!POLAR_ORGANIZATION_ID) {
        console.error('[Polar] VITE_POLAR_ORGANIZATION_ID not configured');
        alert('Payment system not configured. Please contact support.');
        return;
    }

    try {
        // Construct the checkout URL
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
        }

        console.log('[Polar] Opening checkout:', {
            productPriceId,
            email,
            userId,
            env: POLAR_ENV,
        });

        // Option 1: Redirect to Polar checkout page (simplest)
        // window.location.href = checkoutUrl.toString();

        // Option 2: Open in popup window (better UX)
        const popup = window.open(
            checkoutUrl.toString(),
            'polar-checkout',
            'width=600,height=800,resizable=yes,scrollbars=yes'
        );

        if (!popup) {
            console.error('[Polar] Popup blocked. Redirecting instead...');
            window.location.href = checkoutUrl.toString();
            return;
        }

        // Listen for checkout completion
        const handleMessage = (event: MessageEvent) => {
            // Verify origin for security
            const polarOrigin = POLAR_ENV === 'sandbox'
                ? 'https://sandbox.polar.sh'
                : 'https://polar.sh';

            if (event.origin !== polarOrigin) {
                return;
            }

            // Handle checkout events
            if (event.data?.type === 'polar:checkout:success') {
                console.log('[Polar] Checkout successful:', event.data);
                popup?.close();

                if (onSuccess) {
                    onSuccess(event.data.order);
                }

                // Reload to refresh subscription status
                window.location.reload();
            }

            if (event.data?.type === 'polar:checkout:closed') {
                console.log('[Polar] Checkout closed by user');
                window.removeEventListener('message', handleMessage);
            }
        };

        window.addEventListener('message', handleMessage);

        // Cleanup listener after 30 minutes
        setTimeout(() => {
            window.removeEventListener('message', handleMessage);
        }, 30 * 60 * 1000);

    } catch (error) {
        console.error('[Polar] Checkout error:', error);
        alert('Failed to open checkout. Please try again or contact support.');
    }
}

/**
 * Alternative: Create a checkout session via your backend
 * This gives you more control and can be used for embedded checkout
 */
export async function createCheckoutSession({
    productPriceId,
    email,
    userId,
}: {
    productPriceId: string;
    email?: string;
    userId?: string;
}): Promise<string | null> {
    try {
        const response = await fetch('/api/billing/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                productPriceId,
                email,
                userId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const data = await response.json();
        return data.checkoutUrl;
    } catch (error) {
        console.error('[Polar] Failed to create checkout session:', error);
        return null;
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
