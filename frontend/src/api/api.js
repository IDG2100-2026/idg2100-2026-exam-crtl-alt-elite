// Base structure copied from inclass code IDG2100 Fullstack 2026
const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL
} = import.meta.env;

const API_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}/api`;

// Stores the current access token in memory
// Not in localStorage since that's vulnerable to XSS
// The refresh token lives in an httpOnly cookie handled by the browser
let accessToken = null;

// Setter and getter for access token
// Used by auth flows to update the token after login or refresh
export function setAccessToken(token) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

/**
 * Core fetch wrapper
 * Handles common headers, JSON parsing, error responses
 * and automatic token refresh on 401
 *
 * @param {string} endpoint - API endpoint, e.g. "/users"
 * @param {object} options - fetch options (method, body, etc.)
 * @param {boolean} retry - whether this is a retry after token refresh
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiFetch(endpoint, options = {}, retry = false) {
    const headers = {
        ...(options?.headers || {})
    };

    // Only set Content-Type for non-FormData requests
    // FormData sets its own Content-Type with boundary automatically
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    // Add access token to Authorization header if available
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const resp = await fetch(API_URL + endpoint, {
        ...options,
        headers,
        // credentials: "include" is required for httpOnly cookies
        // to be sent cross-origin (refresh token cookie)
        credentials: "include"
    });

    // If 401 and we haven't retried yet, try to refresh the token
    // This handles expired access tokens transparently
    if (resp.status === 401 && !retry) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with the new access token
            return apiFetch(endpoint, options, true);
        }
        // Refresh failed - clear token and throw
        accessToken = null;
        throw new Error("Session expired, please log in again");
    }

    const result = await resp.json().catch(() => null);

    if (!resp.ok) {
        throw new Error(result?.msg || "An error occurred while fetching data");
    }

    return result;
}

// Attempts to refresh the access token using the refresh token cookie
// Returns true if successful, false if not
async function tryRefreshToken() {
    try {
        const resp = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include" // Sends the refresh token cookie
        });

        if (!resp.ok) return false;

        const data = await resp.json();
        accessToken = data.accessToken;
        return true;
    } catch {
        return false;
    }
}

// Convenience wrappers for common HTTP methods
const apiGet = (endpoint) =>
    apiFetch(endpoint, { method: "GET" });

const apiPost = (endpoint, body) =>
    apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });

const apiPut = (endpoint, body) =>
    apiFetch(endpoint, { method: "PUT", body: JSON.stringify(body) });

const apiDelete = (endpoint) =>
    apiFetch(endpoint, { method: "DELETE" });

// Helper to build query strings from a params object
// e.g. { page: 1, limit: 10 } -> "?page=1&limit=10"
const buildQuery = (params = {}) => {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(filtered).toString();
    return query ? `?${query}` : "";
};


// AUTH ENDPOINTS

export const authApi = {
    register: (userData) =>
        apiPost("/auth/register", userData),

    login: async (credentials) => {
        // retry=true skips the refresh-on-401 logic, a 401 here means wrong credentials
        const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        }, true);
        if (data.accessToken) {
            accessToken = data.accessToken;
        }
        return data;
    },

    logout: () =>
        apiPost("/auth/logout", {}),

    refresh: () =>
        apiPost("/auth/refresh", {}),

    verifyEmail: (token) =>
        apiGet(`/auth/email-verification?token=${token}`),

    resendVerification: (email) =>
        apiPost("/auth/email-verification", { email })
};


// USER ENDPOINTS

export const userApi = {
    getById: (userId) =>
        apiGet(`/users/${userId}`),

    getAll: (params = {}) =>
        apiGet(`/users${buildQuery(params)}`),

    update: (userId, data) =>
        apiPut(`/users/${userId}`, data),

    ban: (targetId) =>
        apiPut(`/users/${targetId}/ban`, {}),

    unban: (targetId) =>
        apiPut(`/users/${targetId}/unban`, {}),

    makeAdmin: (targetId) =>
        apiPut(`/users/${targetId}/role`, {}),

    // Avatar upload uses FormData not JSON so we call apiFetch directly
    // This skips the Content-Type: application/json header since multer needs multipart/form-data
    uploadAvatar: (userId, formData) =>
        apiFetch(`/users/${userId}/avatar`, {
            method: "PUT",
            body: formData
        })
};


// GAME VARIANT ENDPOINTS

export const variantApi = {
    getAll: (params = {}) =>
        apiGet(`/variants${buildQuery(params)}`)
};


// GAME ENDPOINTS

export const gameApi = {
    getAll: (params = {}) =>
        apiGet(`/games${buildQuery(params)}`),

    getById: (gameId) =>
        apiGet(`/games/${gameId}`),

    createRoom: (variantId) =>
        apiPost("/games", { variantId }),

    joinRoom: (gameId) =>
        apiPost(`/games/${gameId}/players`, {}),

    leaveRoom: (gameId, userId) =>
        apiDelete(`/games/${gameId}/players/${userId}`)
};


// TOURNAMENT ENDPOINTS

export const tournamentApi = {
    getAll: (params = {}) =>
        apiGet(`/tournaments${buildQuery(params)}`),

    getById: (tournamentId) =>
        apiGet(`/tournaments/${tournamentId}`),

    getStandings: (tournamentId) =>
        apiGet(`/tournaments/${tournamentId}/standings`),

    getGames: (tournamentId) =>
        apiGet(`/tournaments/${tournamentId}/games`),

    join: (tournamentId) =>
        apiPost(`/tournaments/${tournamentId}/players`, {}),

    leave: (tournamentId, userId) =>
        apiDelete(`/tournaments/${tournamentId}/players/${userId}`),

    create: (formData) =>
        apiFetch("/tournaments", {
            method: "POST",
            body: formData // FormData for trophy image upload
        }),

    update: (tournamentId, data) =>
        apiPut(`/tournaments/${tournamentId}`, data),

    cancel: (tournamentId) =>
        apiPut(`/tournaments/${tournamentId}/cancellation`, {}),

    delete: (tournamentId) =>
        apiDelete(`/tournaments/${tournamentId}`)
};


// COMMENT ENDPOINTS

export const commentApi = {
    getAll: (targetId, targetType, params = {}) =>
        apiGet(`/comments${buildQuery({ targetId, targetType, ...params })}`),

    getRecent: (params = {}) =>
        apiGet(`/comments/recent${buildQuery(params)}`),

    create: (body) =>
        apiPost("/comments", body),

    delete: (commentId) =>
        apiDelete(`/comments/${commentId}`)
};


// LEADERBOARD ENDPOINTS

export const leaderboardApi = {
    get: (params = {}) =>
        apiGet(`/leaderboard${buildQuery(params)}`)
};


// ACTIVITY ENDPOINTS

export const activityApi = {
    get: () => apiGet("/activity")
};


// ADMIN ENDPOINTS

export const adminApi = {
    getDashboard: () =>
        apiGet("/admin/dashboard"),

    getIncidents: (params = {}) =>
        apiGet(`/admin/incidents${buildQuery(params)}`)
};