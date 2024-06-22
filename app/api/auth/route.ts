export async function GET() {
	return Response.json(
		{
			success: true,
			message: "You've hit the auth route!"
		},
		{ status: 200 }
	);
}
