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
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('Sign in callback - User:', user);
        console.log('Sign in callback - Account:', account);
        console.log('Sign in callback - Profile:', profile);
        
        await connectDB();
        
        // Check if user exists
        const existingUser = await User.findOne({ email: user.email });
        
        if (existingUser) {
          console.log('User exists, updating last login');
          // Update last login
          existingUser.lastLogin = new Date();
          await existingUser.save();
          
          // Check if user is blocked
          if (existingUser.isBlocked) {
            console.log('User is blocked, preventing sign in');
            return false;
          }
          
          return true;
        }
        
        // Create new user
        console.log('Creating new user');
        const newUser = await User.create({
          name: user.name,
          email: user.email,
          image: user.image,
          lastLogin: new Date(),
        });
        
        console.log('New user created:', newUser._id);
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.isAdmin = dbUser.isAdmin;
            token.isBlocked = dbUser.isBlocked;
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
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };