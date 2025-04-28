import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import connectDB from "../../../../../lib/mongodb";
import { authOptions } from "../../../../../lib/auth";
import User from "../../../../../models/User";

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
    
    // Count only regular users (where isAdmin is false)
    const regularUserCount = await User.countDocuments({ isAdmin: false });

    return NextResponse.json({ count: regularUserCount });
  } catch (error) {
    console.error('Error counting users:', error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 