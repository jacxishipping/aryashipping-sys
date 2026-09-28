import { NextRequest, NextResponse } from 'next/server';
import { QuoteStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, message } = data;

    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { message: 'Name, email, phone, and message are required' },
        { status: 400 }
      );
    }

    const quote = await prisma.quote.create({
      data: {
        name,
        email,
        phone,
        message,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      { message: 'Quote request submitted successfully', quote },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Prisma.QuoteWhereInput = status 
      ? { status: status as QuoteStatus } 
      : {};

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

