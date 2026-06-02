import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ requireAdmin = false }) {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/', {
                state: { loginModal: true, from: location },
                replace: true,
                preventScrollReset: true,
            });
        }
    }, [user]);

    if (!user) return null;

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
