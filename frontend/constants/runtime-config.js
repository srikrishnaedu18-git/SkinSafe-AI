import Constants from 'expo-constants';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const rawMock = process.env.EXPO_PUBLIC_USE_MOCK_API?.trim().toLowerCase();

function extractExpoHost() {
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri ?? null;
    if (!hostUri)
        return null;
    const [host] = hostUri.split(':');
    return host?.trim() || null;
}

function buildBaseUrls() {
    const candidates = [];
    const pushUnique = (value) => {
        if (!value)
            return;
        const normalized = value.trim().replace(/\/+$/, '');
        if (!normalized || candidates.includes(normalized))
            return;
        candidates.push(normalized);
    };

    pushUnique(rawBaseUrl);

    const expoHost = extractExpoHost();
    if (expoHost) {
        pushUnique(`http://${expoHost}:8080`);
    }

    pushUnique('http://localhost:8080');
    pushUnique('http://127.0.0.1:8080');
    pushUnique('http://10.0.2.2:8080');

    return candidates;
}

function toBoolean(value, fallback) {
    if (!value)
        return fallback;
    if (value === 'true' || value === '1' || value === 'yes')
        return true;
    if (value === 'false' || value === '0' || value === 'no')
        return false;
    return fallback;
}
export const runtimeConfig = {
    apiBaseUrl: buildBaseUrls()[0] ?? 'http://localhost:8080',
    apiBaseUrls: buildBaseUrls(),
    useMockApi: toBoolean(rawMock, true),
};
