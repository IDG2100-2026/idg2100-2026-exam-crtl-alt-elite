// Copied directly from inclass code IDG2100 Fullstack 2026
// Which is again copied from oblig 3
import { createContext, useContext } from "react";

export const AuthContext = createContext({ 
    user: null, 
    login: () => {}, 
    logout: () => {} 
});


export const useAuth = () => useContext(AuthContext);