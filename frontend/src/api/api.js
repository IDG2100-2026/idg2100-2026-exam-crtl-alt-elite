// Base structure copied from inclass code IDG2100 Fullstack 2026 
// Based on code from Nora Storro (Fullstack assignment 3)
const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL,
} = import.meta.env;

const API_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}/api`;

/** 
 * Core fetch wrapper
 * Handles common headers, JSON parsing and error responses
 * 
 * @param {string} endpoint - API endpoint, e.g. "/users"
 * @param {object} options - fetch options (method, body, etc.)
 * @param {number|null} userId - userId for x-user-id header, null for anonymous
 * @returns {Promise<any>} parsed JSON response
 */
// if you have apiGet instead <-- you'd specify {method: "GET"} in the options by default
export async function apiFetch(endpoint, options = {}, userId = null) {
    // endpoint could be something like /

    // Take whatever headers is passed in and alwais include the content type
    const headers = {
        ...(options?.headers || {}), 
    };

    // Only set Content-Type for non-FormData requests
    // FormData sets its own Content-Type with boundary automatically
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    // Add auth header if userId is provided
    // This is how our rudimentary auth works (see auth middleware in backend)
    if (userId != null) {
        headers["x-user-id"] = userId;
    }

    // Sends the HTTP request to the backend
    const resp = await fetch(API_URL + endpoint, {
        ...options,
        headers
    });

    // The response/result from the backend request
    const result = await resp.json().catch(() => null);

    if(!resp.ok) {
        throw new Error(result?.msg || "An error occured while fetching data");
    }

    return result;
}

// Convenience wrappers for common HTTP methods
const apiGet = (endpoint, userId = null) => 
    apiFetch(endpoint, { method: "GET" }, userId);

const apiPost = (endpoint, body, userId = null) => 
    apiFetch(endpoint, { method: "POST", body: JSON.stringify(body)}, userId);

const apiPut = (endpoint, body, userId = null) =>
    apiFetch(endpoint, { method: "PUT", body: JSON.stringify(body) }, userId);

const apiDelete = (endpoint, userId = null) =>
    apiFetch(endpoint, { method: "DELETE" }, userId);

// Helper to build query strings from a params object
// e.g. { page: 1, limit: 10 } -> "?page?1&limit=10"
const buildQuery = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return query ? `?${query}` : "";
};


// USER ENDPOINTS

export const userApi = {
    register: (userData) =>
        apiPost("/register", userData),

    login: (credentials) =>
        apiPost("/login", credentials),

    getById: (userId, requesterId) =>
        apiGet(`/users/${userId}`, requesterId),

    getAll: (adminId, params = {}) =>
        apiGet(`/users${buildQuery(params)}`, adminId),

    update: (userId, data) =>
        apiPut(`/users/${userId}`, data, userId),

    ban: (targetId, adminId) =>
        apiPut(`/users/${targetId}/ban`, {}, adminId),

    // Avatar upload uses FormData not JSON so we call apiFetch directly
    // This skips the Content-Type: application/json header since multer needs multipart/form-data
    uploadAvatar: (userId, formData) =>
        apiFetch(`/users/${userId}/avatar`, {
            method: "PUT",
            body: formData
        }, userId)
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

    createRoom: (body, userId) =>
        apiPost("/games", body, userId),

    invite: (body, userId) =>
        apiPost("/games/invite", body, userId),

    acceptInvite: (gameId, userId) =>
        apiPost(`/games/${gameId}/accept`, {}, userId),

    declineInvite: (gameId, userId) =>
        apiPost(`/games/${gameId}/decline`, {}, userId),

    submitResult: (gameId, scores, userId) =>
        apiPut(`/games/${gameId}/result`, scores, userId)
};


// TOURNAMENT ENDPOINTS

export const tournamentApi = {
    getAll: (params = {}) =>
        apiGet(`/tournaments${buildQuery(params)}`),

    getById: (tournamentId) =>
        apiGet(`/tournaments/${tournamentId}`),

    getStandings: (tournamentId) =>
        apiGet(`/tournaments/${tournamentId}/standings`),

    join: (tournamentId, userId) =>
        apiPost(`/tournaments/${tournamentId}/join`, {}, userId),

    create: (data, adminId) =>
        apiPost("/tournaments", data, adminId),

    update: (tournamentId, data, adminId) =>
        apiPut(`/tournaments/${tournamentId}`, data, adminId)
};


// COMMENT ENDPOINTS

export const commentApi = {
    getAll: (targetId, targetType, params = {}) =>
        apiGet(`/comments${buildQuery({ targetId, targetType, ...params })}`),

    create: (body, userId) =>
        apiPost("/comments", body, userId),

    delete: (commentId, adminId) =>
        apiDelete(`/comments/${commentId}`, adminId)
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