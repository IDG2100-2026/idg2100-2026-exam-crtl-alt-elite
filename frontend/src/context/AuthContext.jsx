import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const userId = localStorage.getItem("userId");
        const username = localStorage.getItem("username");
        return userId ? { userId: Number(userId), username } : null;
    });

    function login(userId, username) {
        localStorage.setItem("userId", userId);
        localStorage.setItem("username", username);
        setUser({ userId, username });
    }

    function logout() {
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
