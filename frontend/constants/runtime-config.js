const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const rawMock = process.env.EXPO_PUBLIC_USE_MOCK_API?.trim().toLowerCase();
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
    apiBaseUrl: rawBaseUrl && rawBaseUrl.length > 0 ? rawBaseUrl : 'https://api.placeholder.local',
    useMockApi: toBoolean(rawMock, true),
};
