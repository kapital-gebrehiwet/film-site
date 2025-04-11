"use client";
import React from "react";
import { Button } from "../components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

const Login = () => {
  const handleGoogleSignIn = () => {
    signIn("google");
  };

  return (
    <section className="border shadow-lg min-h-screen flex items-center justify-center px-4 py-8 dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl dark:text-white">
            <strong className="text-white">Stream</strong> Anytime, Anywhere
          </h1>

          <p className="mt-4 text-base text-white md:text-lg lg:text-xl dark:text-gray-200">
            Unlimited access to the latest movies and TV shows. Watch on any device, with no ads or interruptions.
          </p>

          <div className="mt-6 text-3xl md:mt-8 flex justify-center">
            <Button
              onClick={handleGoogleSignIn}
              className="flex text-2xl items-center gap-2"
            >
              <FcGoogle className="text-xl" />
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
