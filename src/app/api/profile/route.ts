import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const sanitizeString = (value: unknown) => {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
};

export async function GET() {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				role: true,
				phone: true,
				address: true,
				city: true,
				country: true,
				loginCode: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			return NextResponse.json({ message: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ user }, { status: 200 });
	} catch (error) {
		console.error('Error fetching profile:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const payload = await request.json();
		const updates: Record<string, string | null> = {};

		const name = sanitizeString(payload.name);
		const image = sanitizeString(payload.image);
		const phone = sanitizeString(payload.phone);
		const address = sanitizeString(payload.address);
		const city = sanitizeString(payload.city);
		const country = sanitizeString(payload.country);

		if (name !== undefined) updates.name = name;
		if (image !== undefined) updates.image = image;
		if (phone !== undefined) updates.phone = phone;
		if (address !== undefined) updates.address = address;
		if (city !== undefined) updates.city = city;
		if (country !== undefined) updates.country = country;

		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ message: 'No valid fields provided' }, { status: 400 });
		}

		const updatedUser = await prisma.user.update({
			where: { id: session.user.id },
			data: updates,
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				role: true,
				phone: true,
				address: true,
				city: true,
				country: true,
				loginCode: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return NextResponse.json({ user: updatedUser }, { status: 200 });
	} catch (error) {
		console.error('Error updating profile:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}
