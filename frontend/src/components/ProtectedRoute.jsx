import { Navigate, Outlet } from "react-router";
import { useContext } from "react";
import { AuthContext } from "../Contexts/AuthContext";

export default function ProtectedRoute({ requireAdmin = false }){
	const { user } = useContext(AuthContext);

    // not logged in send to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !user.isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
