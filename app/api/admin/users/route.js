import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import User from "../../../../models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is admin
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Fetch all users from MongoDB using Mongoose
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select('name email image isAdmin createdAt lastLogin');

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 