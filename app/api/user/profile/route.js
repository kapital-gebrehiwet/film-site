import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id)
      .select('name email image notifications purchasedMovies')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch profile',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the request is JSON or FormData
    const contentType = request.headers.get('content-type') || '';
    let userData = {};
    
    if (contentType.includes('application/json')) {
      // Handle JSON data
      userData = await request.json();
    } else {
      // Handle FormData
      const formData = await request.formData();
      
      // Extract form fields
      const name = formData.get('name');
      const email = formData.get('email');
      const imageFile = formData.get('image');
      const notificationsData = formData.get('notifications');
      const purchasedMoviesData = formData.get('purchasedMovies');
      
      // Add to userData object
      if (name) userData.name = name;
      if (email) userData.email = email;
      if (notificationsData) {
        try {
          userData.notifications = JSON.parse(notificationsData);
        } catch (error) {
          console.error('Error parsing notifications data:', error);
        }
      }
      if (purchasedMoviesData) {
        try {
          userData.purchasedMovies = JSON.parse(purchasedMoviesData);
        } catch (error) {
          console.error('Error parsing purchasedMovies data:', error);
        }
      }
      
      // Handle image file separately
      if (imageFile) {
        userData.imageFile = imageFile;
      }
    }
    
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update profile information
    if (userData.name) user.name = userData.name;
    if (userData.email) user.email = userData.email;
    
    // Update purchased movies if provided
    if (userData.purchasedMovies) {
      user.purchasedMovies = userData.purchasedMovies;
    }

    // Handle profile picture upload
    if (userData.imageFile) {
      const bytes = await userData.imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create unique filename
      const filename = `${user._id}-${Date.now()}${path.extname(userData.imageFile.name)}`;
      const filepath = path.join(process.cwd(), 'public/uploads', filename);

      // Save the file
      await writeFile(filepath, buffer);

      // Update user's image path
      user.image = `/uploads/${filename}`;
    }

    // Update notification preferences
    if (userData.notifications) {
      user.notifications = {
        ...user.notifications,
        ...userData.notifications
      };
    }

    await user.save();

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        name: user.name,
        email: user.email,
        image: user.image,
        notifications: user.notifications,
        purchasedMovies: user.purchasedMovies
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error.message
    }, { status: 500 });
  }
} 