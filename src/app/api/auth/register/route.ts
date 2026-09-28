import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { hasPermission, normalizeRole } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'customers:manage') && !hasPermission(session.user?.role, 'users:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can create user accounts' },
        { status: 403 }
      );
    }

    const { name, email, password, role, phone, address, city, country } = await request.json();
    const requestedRole = normalizeRole(role);

    if (requestedRole !== 'user' && !hasPermission(session.user?.role, 'users:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: You cannot create internal user roles' },
        { status: 403 }
      );
    }

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: requestedRole,
        phone,
        address,
        city,
        country,
      },
    });

    // Remove password from response
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    void _passwordHash;

    return NextResponse.json(
      { message: 'User created successfully', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
