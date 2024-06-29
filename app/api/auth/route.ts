import { NextResponse } from 'next/server';

// eslint-disable-next-line no-unused-vars
async function handler() {
	return NextResponse.json(
		{
			success: true,
			message: "You've hit the auth route!"
		},
		{ status: 200 }
	);
}

export { handler as GET, handler as POST };
