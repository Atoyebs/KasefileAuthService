import './zod-extensions';
import { signupSchema } from '../api/auth/signup/validation';

describe('Zod tests', () => {
	const baseData = {
		username: 'test',
		email: 'testing@internal-emails.com',
		password: 'testing123',
		firstname: 'Ini',
		lastname: 'Atoyebi'
	};

	test('safeParseV2 schema parse should pass validation with no errors', () => {
		const result = signupSchema.safeParseV2(baseData);
		expect(result).toHaveProperty('success', true);
		expect(result).toHaveProperty('error', null);
		expect(result).toHaveProperty('data', baseData);
	});

	test('safeParseV2 schema parse should fail username validation with single string error', () => {
		const result = signupSchema.safeParseV2({
			...baseData,
			username: 'te'
		});
		expect(result).toHaveProperty('success', false);
		expect(result).toHaveProperty('data', null);
		expect(result).toHaveProperty(
			'error',
			'username: String must contain at least 3 character(s)'
		);
	});

	test('safeParseV2 schema parse should fail email validation with single string error', () => {
		const result = signupSchema.safeParseV2({
			...baseData,
			email: 'info@testemail'
		});
		expect(result).toHaveProperty('success', false);
		expect(result).toHaveProperty('error', 'email: Invalid email');
	});
});
