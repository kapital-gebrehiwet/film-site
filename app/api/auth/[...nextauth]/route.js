import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "../../../../lib/mongodb";
import User from "../../../../models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        try {
          await connectDB();
          
          // Check if user exists and is blocked
          const existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            if (existingUser.isBlocked) {
              // Return false to prevent sign in and redirect to error page
              return false;
            }
          } else {
            // Create new user
            await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              isAdmin: false,
              isBlocked: false
            });
          }
          
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.isAdmin = dbUser.isAdmin;
            token.isBlocked = dbUser.isBlocked;
          }
        } catch (error) {
          console.error("Error in jwt callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.isAdmin = token.isAdmin;
        session.user.isBlocked = token.isBlocked;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };