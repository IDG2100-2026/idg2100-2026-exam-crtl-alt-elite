// Code copied directly from inclass code IDG2100 Fullstack 2026
// Modified to work with JWT authentication
import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { authApi, setAccessToken } from "../api/api.js";
import { connectSocket, disconnectSocket } from "../api/socket.js";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // loading is true while we check if the user has a valid session
    // Prevents protected routes from flashing as logged out on page reload
    const [loading, setLoading] = useState(true);

    // On mount, try to restore session from the refresh token cookie
    // The cookie persists across page reloads so the user stays logged in
    // localStorage is not used since it's a security risk for auth tokens
    useEffect(() => {
        async function restoreSession() {
            try {
                const data = await authApi.refresh();
                if (data.accessToken) {
                    setAccessToken(data.accessToken);
                    setUser({
                        userId: data.userId,
                        username: data.username,
                        role: data.role
                    });
                    connectSocket();
                }
            } catch {
                // No valid session, user needs to log in
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        restoreSession();
    }, []);

    // Calls the backend login endpoint and stores the access token in memory
    const login = async (emailOrUsername, pwd) => {
        const data = await authApi.login({ emailOrUsername, pwd });
        setAccessToken(data.accessToken);
        setUser({
            userId: data.userId,
            username: data.username,
            role: data.role
        });
        connectSocket();
        return data;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Continue with logout even if the API call fails
        } finally {
            setAccessToken(null);
            disconnectSocket();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};