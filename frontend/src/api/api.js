const {
    VITE_API_HOSTNAME,
    VITE_API_PORT,
    VITE_API_PROTOCOL
} = import.meta.env;

const API_URL = `${VITE_API_PROTOCOL}://${VITE_API_HOSTNAME}:${VITE_API_PORT}/api`;

let accessToken = null;

export function setAccessToken(token) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

export async function apiFetch(endpoint, options = {}, retry = false) {
    const headers = {
        ...(options?.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const resp = await fetch(API_URL + endpoint, {
        ...options,
        headers,
        credentials: "include"
    });

    if (resp.status === 401 && !retry) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            return apiFetch(endpoint, options, true);
        }
        accessToken = null;
        throw new Error("Session expired, please log in again");
    }

    const result = await resp.json().catch(() => null);

    if (!resp.ok) {
        throw new Error(result?.msg || "An error occurred while fetching data");
    }

    return result;
}

async function tryRefreshToken() {
    try {
        const resp = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include"
        });

        if (!resp.ok) return false;

        const data = await resp.json();
        accessToken = data.accessToken;
        return true;
    } catch {
        return false;
    }
}

const apiGet = (endpoint) =>
    apiFetch(endpoint, { method: "GET" });

const apiPost = (endpoint, body) =>
    apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });

const apiPut = (endpoint, body) =>
    apiFetch(endpoint, { method: "PUT", body: JSON.stringify(body) });

const apiDelete = (endpoint) =>
    apiFetch(endpoint, { method: "DELETE" });

const buildQuery = (params = {}) => {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(filtered).toString();
    return query ? `?${query}` : "";
};


export const authApi = {
    register: (userData) =>
        apiPost("/auth/register", userData),

    login: async (credentials) => {
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

    uploadAvatar: (userId, formData) =>
        apiFetch(`/users/${userId}/avatar`, {
            method: "PUT",
            body: formData
        })
};


export const variantApi = {
    getAll: (params = {}) =>
        apiGet(`/variants${buildQuery(params)}`)
};


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
            body: formData
        }),

    update: (tournamentId, data) =>
        apiPut(`/tournaments/${tournamentId}`, data),

    cancel: (tournamentId) =>
        apiPut(`/tournaments/${tournamentId}/cancellation`, {}),

    delete: (tournamentId) =>
        apiDelete(`/tournaments/${tournamentId}`)
};


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


export const leaderboardApi = {
    get: (params = {}) =>
        apiGet(`/leaderboard${buildQuery(params)}`)
};


export const activityApi = {
    get: () => apiGet("/activity")
};


export const adminApi = {
    getDashboard: () =>
        apiGet("/admin/dashboard"),

    getIncidents: (params = {}) =>
        apiGet(`/admin/incidents${buildQuery(params)}`)
};
