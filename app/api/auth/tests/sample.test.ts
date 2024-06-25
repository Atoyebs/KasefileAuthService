import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '../route'; // Adjust path to your API handler

describe('/api/auth', () => {
	it('GET responds with JSON', async () => {
		await testApiHandler({
			appHandler,
			test: async ({ fetch }) => {
				const response = await fetch({ method: 'GET' });
				const json = await response.json();
				expect(response.status).toBe(200);
				await expect(json).toStrictEqual({
					success: true,
					message: "You've hit the auth route!"
				});
			}
		});
	}, 10000);
});
