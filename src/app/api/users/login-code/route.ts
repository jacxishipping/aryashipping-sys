import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isValidLoginCode } from '@/lib/loginCode';
import { generateLoginCode } from '@/lib/loginCodeGenerator';

/**
 * GET /api/users/login-code?userId=xxx
 * Get a user's login code (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        loginCode: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      loginCode: user.loginCode,
    });
  } catch (error) {
    console.error('Error getting login code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/login-code
 * Generate or update a user's login code (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, customCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let loginCode: string;

    if (customCode) {
      // Validate custom code
      const code = customCode.trim().toUpperCase();
      
      if (!isValidLoginCode(code)) {
        return NextResponse.json(
          { error: 'Invalid login code format. Must be 8 alphanumeric characters.' },
          { status: 400 }
        );
      }

      // Check if code is already in use by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          loginCode: {
            equals: code,
            mode: 'insensitive'
          },
          NOT: {
            id: userId
          }
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'This login code is already in use by another user' },
          { status: 409 }
        );
      }

      loginCode = code;
    } else {
      // Generate a unique code
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        loginCode = generateLoginCode();
        
        const existingUser = await prisma.user.findFirst({
          where: {
            loginCode: {
              equals: loginCode,
              mode: 'insensitive'
            }
          },
        });

        if (!existingUser) {
          break;
        }

        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: 'Failed to generate unique code. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Update user with new login code
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { loginCode },
      select: {
        id: true,
        name: true,
        email: true,
        loginCode: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Login code updated successfully',
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      loginCode: updatedUser.loginCode,
    });
  } catch (error) {
    console.error('Error setting login code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/login-code?userId=xxx
 * Remove a user's login code (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { loginCode: null },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Login code removed successfully',
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (error) {
    console.error('Error removing login code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
