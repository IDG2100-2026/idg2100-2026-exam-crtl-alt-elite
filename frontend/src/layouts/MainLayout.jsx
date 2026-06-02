import { Outlet, useLocation, useNavigate } from "react-router";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import LoginPrompt from "@/components/LoginPrompt/LoginPrompt.jsx";

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const showLoginModal = location.state?.loginModal;
    const from = location.state?.from;

    function closeModal() {
        navigate('/', { replace: true, state: {} });
    }

    return (
        <div className="layout">
            <Header />
            <main className="content">
                <Outlet />
            </main>
            <Footer />
            {showLoginModal && (
                <LoginPrompt
                    message="You need to be logged in to play."
                    from={from}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}
