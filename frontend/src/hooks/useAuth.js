// Copied directly from inclass code IDG2100 Fullstack 2026
// Which is again copied from oblig 3
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";

export const useAuth = ()=> useContext(AuthContext);