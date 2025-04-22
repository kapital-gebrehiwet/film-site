import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "../../../../lib/mongodb";
import User from "../../../../models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user?.email) {
          console.error('No email provided by OAuth provider');
          return false;
        }

        await connectDB();
        
        // Check if user exists
        const existingUser = await User.findOne({ email: user.email });
        
        if (existingUser) {
          // Update last login and activity
          existingUser.lastLogin = new Date();
          existingUser.lastActivity = new Date();
          await existingUser.save();
          
          // Check if user is blocked
          if (existingUser.isBlocked) {
            return '/auth/blocked';
          }
          
          return true;
        }
        
        // Create new user
        const newUser = await User.create({
          name: user.name,
          email: user.email,
          image: user.image,
          lastLogin: new Date(),
          lastActivity: new Date(),
          notifications: {
            email: true,
            push: true,
            marketing: false,
            newMovies: true,
            movieNotifications: []
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return '/auth/error?error=DatabaseError';
      }
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.isAdmin = dbUser.isAdmin || false;
            token.isBlocked = dbUser.isBlocked || false;
            token.lastActivity = dbUser.lastActivity;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.image = dbUser.image;
          }
        } catch (error) {
          console.error('Error in JWT callback:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin;
        session.user.isBlocked = token.isBlocked;
        session.user.lastActivity = token.lastActivity;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.image;
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    newUser: '/auth/new-user',
    verifyRequest: '/auth/verify',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };