import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const { isBlocked } = await request.json();

    await connectDB();
    
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    user.isBlocked = isBlocked;
    await user.save();

    return NextResponse.json({ 
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error("Error in PATCH /api/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 