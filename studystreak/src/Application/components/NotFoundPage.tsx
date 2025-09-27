import React from "react";
import { useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="bg-white/10 dark:bg-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-400 drop-shadow">404 - Not Found</h1>
        <p className="mb-6 text-white/70 text-lg">
          The page you are looking for does not exist.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-white font-medium shadow-lg hover:scale-[1.03] transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;