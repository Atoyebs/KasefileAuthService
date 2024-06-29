import * as R from 'ramda';
/**
 * Checks if a given value is empty.
 * List of values considered empty: **undefined**, **null**, **''***(empty string)*, **0**, **{}**, **[]**
 *
 * @param {any} value - The value to be checked.
 * @return {boolean} Returns true if the value is empty, false otherwise.
 */
export function isEmptyValue(value: any): boolean {
	const isEmpty = R.anyPass([R.isNil, R.isEmpty, R.equals(0)]);
	return isEmpty(value);
}
