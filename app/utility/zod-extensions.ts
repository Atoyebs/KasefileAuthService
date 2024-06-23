/* eslint-disable no-unused-vars */
import { ZodType, ZodTypeDef } from 'zod';

// Define the new safeParseV2 method
function safeParseV2<T>(this: ZodType<T, ZodTypeDef, T>, data: unknown) {
	const result = this.safeParse(data);
	if (result.success) {
		return {
			success: true,
			data: result.data,
			error: null
		};
	}

	const errorsArray = JSON.parse(result?.error as any);
	const error = errorsArray[0];
	const path = error?.path[0];
	const message = error.message;

	return {
		success: false,
		data: null,
		error: `${path}: ${message}`
	};
}

// Add safeParseV2 to ZodType prototype
(ZodType.prototype as any).safeParseV2 = safeParseV2;

// Module augmentation to add type definition for safeParseV2
declare module 'zod' {
	interface ZodType<
		Output = any,
		Def extends ZodTypeDef = ZodTypeDef,
		Input = Output
	> {
		safeParseV2(data: unknown): {
			success: boolean;
			data: Output | null;
			error: null | undefined | string;
		};
	}
}
