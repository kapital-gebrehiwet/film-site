"use client";

import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";

const Login = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoogleSignIn = () => {
    signIn("google");
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 px-4 py-6">
      {/* Light Interactive Background */}
      <div
        className="absolute w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-gradient-to-r from-blue-300 to-purple-400 blur-3xl opacity-30 pointer-events-none"
        style={{
          left: `${mousePosition.x - 150}px`,
          top: `${mousePosition.y - 150}px`,
          transition: "all 0.1s ease-out",
        }}
      />
      
      {/* Content */}
      <motion.div
        className="relative w-full max-w-md md:max-w-lg mx-auto bg-white/10 backdrop-blur-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-lg md:shadow-xl border border-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-4">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            StreamHub
          </span>
        </h1>
        <p className="text-center text-white/80 text-base md:text-lg mb-6">
          Watch unlimited movies and shows, anytime, anywhere.
        </p>

        <motion.div
          className="mt-6 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            onClick={handleGoogleSignIn}
            className="relative overflow-hidden flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg font-medium hover:shadow-lg hover:shadow-purple-400/40 transition-transform transform hover:scale-105"
          >
            <FcGoogle className="text-xl md:text-2xl" />
            <span>Sign in with Google</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-center py-3 md:py-4 text-white/70 text-xs md:text-sm">
        &copy; 2025 StreamHub. All rights reserved.
      </footer>
    </section>
  );
};

export default Login;
