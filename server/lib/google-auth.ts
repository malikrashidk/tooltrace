import { google } from "googleapis";
import type { Credentials } from "google-auth-library";

function createOAuth2Client(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const defaultRedirectUri = redirectUri || process.env.GOOGLE_REDIRECT_URL;

    if (!clientId || !clientSecret) {
        throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    }

    return new google.auth.OAuth2(clientId, clientSecret, defaultRedirectUri);
}

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.metadata"
];

export function getAuthUrl(userId: string, redirectUri?: string) {
    const client = createOAuth2Client(redirectUri);
    return client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state: userId,
    });
}

export async function getTokensFromCode(code: string, redirectUri?: string) {
    const client = createOAuth2Client(redirectUri);
    const { tokens } = await client.getToken(code);
    return tokens;
}

export function getClient(tokens: Credentials) {
    const client = createOAuth2Client();
    client.setCredentials(tokens);
    return client;
}

export async function refreshAccessToken(refreshToken: string) {
    const client = createOAuth2Client();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return credentials;
}
