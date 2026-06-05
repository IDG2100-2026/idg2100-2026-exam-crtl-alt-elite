import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";

export const useAuth = ()=> useContext(AuthContext);
