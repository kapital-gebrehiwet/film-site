import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Logo from '../components/logo';
import Footer from '../components/footer';
import Login from '../components/login';
import { authOptions } from "../lib/auth";

// Server component
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user) {
    // Debug logs
    console.log('Page - Session user:', session.user);
    console.log('Page - User email:', session.user.email);
    console.log('Page - Admin email:', process.env.ADMIN_EMAIL);
    console.log('Page - Is admin?:', session.user.isAdmin);
    
    // Strict check for admin status
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL;
    console.log('Page - Strict admin check:', isAdmin);
    
    if (isAdmin) {
      console.log('Page - Redirecting to admin...');
      redirect("/admin");
    } else {
      console.log('Page - Redirecting to user...');
      redirect("/user");
    }
  }

  return (
    <div className="bdy">
      
      <Logo className="m-5" />
      <Login />
      <Footer />
    </div>
  );
}