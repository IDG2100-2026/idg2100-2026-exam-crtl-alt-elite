// Based on code from Nora Storro (Fullstack assignment 3)
import { createContext } from "react";

export const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
});
