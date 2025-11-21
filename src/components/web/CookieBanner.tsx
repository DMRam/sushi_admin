import { useEffect, useState } from "react";

export default function CookieBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookieConsent");
        if (!consent) setShow(true);
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("cookieConsent", "true");
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="
      fixed bottom-4 left-4 right-4
      sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px]
      bg-white/95 backdrop-blur-xl border border-gray-300/50 
      shadow-xl rounded-xl p-4 text-sm z-[999999]
      animate-fade-in
    ">
            <p className="text-gray-700 font-light leading-relaxed">
                Usamos cookies esenciales para mejorar tu experiencia.{" "}
                <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 underline"
                >
                    Saber más
                </a>.
            </p>

            <div className="flex justify-end mt-3">
                <button
                    onClick={acceptCookies}
                    className="bg-red-500 text-white px-4 py-1.5 text-xs rounded-md hover:bg-red-600 transition-colors"
                >
                    Aceptar
                </button>
            </div>
        </div>
    );
}
