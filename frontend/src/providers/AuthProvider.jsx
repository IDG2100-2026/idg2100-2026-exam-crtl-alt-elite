import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { authApi, setAccessToken } from "../api/api.js";
import { connectSocket, disconnectSocket } from "../api/socket.js";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        restoreSession();
    }, []);

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
