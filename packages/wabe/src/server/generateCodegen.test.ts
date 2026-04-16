import { describe, expect, it } from 'bun:test'
import type { TypeField } from '../schema'
import type { DevWabeTypes } from '../utils/helper'
import {
	getEndChar,
	getFileInputTypeString,
	getFileOutputTypeString,
	getFileTypeString,
	getIndent,
	getQuoteChar,
	wabeClassRecordToString,
	wabeEnumRecordToString,
	wabeScalarRecordToString,
	wabeTypesToTypescriptTypes,
	wrapLongGraphqlFieldArguments,
	generateWabeDevTypes,
} from './generateCodegen'

const mkField = (overrides: Record<string, any>) => overrides as unknown as TypeField<DevWabeTypes>

describe('Format helpers', () => {
	describe('getIndent', () => {
		it('should default to tab', () => {
			expect(getIndent()).toBe('\t')
			expect(getIndent({})).toBe('\t')
		})

		it('should use provided indent', () => {
			expect(getIndent({ indent: '  ' })).toBe('  ')
			expect(getIndent({ indent: '    ' })).toBe('    ')
		})
	})

	describe('getEndChar', () => {
		it('should default to empty string', () => {
			expect(getEndChar()).toBe('')
			expect(getEndChar({})).toBe('')
		})

		it('should return semicolon when semi is true', () => {
			expect(getEndChar({ semi: true })).toBe(';')
		})

		it('should return comma when comma is true', () => {
			expect(getEndChar({ comma: true })).toBe(',')
		})

		it('should prefer semi over comma', () => {
			expect(getEndChar({ semi: true, comma: true })).toBe(';')
		})
	})

	describe('getQuoteChar', () => {
		it('should default to single quote', () => {
			expect(getQuoteChar()).toBe("'")
			expect(getQuoteChar({})).toBe("'")
		})

		it('should return double quote when specified', () => {
			expect(getQuoteChar({ quote: 'double' })).toBe('"')
		})

		it('should return single quote when specified', () => {
			expect(getQuoteChar({ quote: 'single' })).toBe("'")
		})
	})

	describe('getFileOutputTypeString', () => {
		it('should use comma separator by default', () => {
			expect(getFileOutputTypeString()).toBe(
				'{ name: string, url?: string, urlGeneratedAt?: string, isPresignedUrl: boolean }',
			)
		})

		it('should use semicolon separator when semi is true', () => {
			expect(getFileOutputTypeString({ semi: true })).toBe(
				'{ name: string; url?: string; urlGeneratedAt?: string; isPresignedUrl: boolean }',
			)
		})
	})

	describe('getFileInputTypeString', () => {
		it('should return an XOR union (file | url+name) with comma separator by default', () => {
			expect(getFileInputTypeString()).toBe(
				'{ file: File, url?: never, name?: never } | { file?: never, url: string, name: string }',
			)
		})

		it('should return an XOR union (file | url+name) with semicolon separator when semi is true', () => {
			expect(getFileInputTypeString({ semi: true })).toBe(
				'{ file: File; url?: never; name?: never } | { file?: never; url: string; name: string }',
			)
		})
	})

	describe('getFileTypeString', () => {
		it('should default to output type', () => {
			expect(getFileTypeString()).toBe(getFileOutputTypeString())
		})

		it('should return the input type when isInput is true', () => {
			expect(getFileTypeString(undefined, true)).toBe(getFileInputTypeString())
		})
	})
})

describe('wabeTypesToTypescriptTypes', () => {
	it('should map primitive types', () => {
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'String' }) })).toBe('string')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Int' }) })).toBe('number')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Float' }) })).toBe('number')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Boolean' }) })).toBe('boolean')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Any' }) })).toBe('any')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Email' }) })).toBe('string')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Phone' }) })).toBe('string')
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Hash' }) })).toBe('string')
	})

	it('should return string for Date when not input', () => {
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'Date' }) })).toBe('string')
	})

	it('should return Date for Date when isInput', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Date' }),
				isInput: true,
			}),
		).toBe('Date')
	})

	it('should return File output type object by default', () => {
		expect(wabeTypesToTypescriptTypes({ field: mkField({ type: 'File' }) })).toBe(
			'{ name: string, url?: string, urlGeneratedAt?: string, isPresignedUrl: boolean }',
		)
	})

	it('should return File output type with semi format', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'File' }),
				formatOptions: { semi: true },
			}),
		).toBe('{ name: string; url?: string; urlGeneratedAt?: string; isPresignedUrl: boolean }')
	})

	it('should return File input type object when isInput', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'File' }),
				isInput: true,
			}),
		).toBe(
			'{ file: File, url?: never, name?: never } | { file?: never, url: string, name: string }',
		)
	})

	it('should return File input type with semi format when isInput', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'File' }),
				isInput: true,
				formatOptions: { semi: true },
			}),
		).toBe(
			'{ file: File; url?: never; name?: never } | { file?: never; url: string; name: string }',
		)
	})

	it('should handle Array of primitives', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Array', typeValue: 'String' }),
			}),
		).toBe('Array<string>')

		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Array', typeValue: 'Int' }),
			}),
		).toBe('Array<number>')
	})

	it('should handle Array of Object', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({
					type: 'Array',
					typeValue: 'Object',
					object: { name: 'Addr' },
				}),
			}),
		).toBe('Array<Addr>')
	})

	it('should handle Array of File with output format by default', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Array', typeValue: 'File' }),
			}),
		).toBe(
			'Array<{ name: string, url?: string, urlGeneratedAt?: string, isPresignedUrl: boolean }>',
		)
	})

	it('should handle Array of File with input format when isInput', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Array', typeValue: 'File' }),
				isInput: true,
			}),
		).toBe(
			'Array<{ file: File, url?: never, name?: never } | { file?: never, url: string, name: string }>',
		)
	})

	it('should handle Pointer', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Pointer', class: 'User' }),
			}),
		).toBe('User')
	})

	it('should handle Relation', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Relation', class: 'Post' }),
			}),
		).toBe('Array<Post>')
	})

	it('should handle Object', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'Object', object: { name: 'Address' } }),
			}),
		).toBe('Address')
	})

	it('should fall through to field.type for unknown types (enums/scalars)', () => {
		expect(
			wabeTypesToTypescriptTypes({
				field: mkField({ type: 'MyCustomEnum' }),
			}),
		).toBe('MyCustomEnum')
	})
})

describe('wabeClassRecordToString', () => {
	it('should output empty type for empty fields', () => {
		const result = wabeClassRecordToString({ User: {} })
		expect(result).toBe('export type User = {}\n\n')
	})

	it('should output type with fields using default format (tab, no trailing char)', () => {
		const result = wabeClassRecordToString({
			User: { name: 'string', age: 'number' },
		})
		expect(result).toBe('export type User = {\n\tname: string\n\tage: number\n}\n\n')
	})

	it('should use semicolons when semi is true', () => {
		const result = wabeClassRecordToString(
			{ User: { name: 'string', age: 'number' } },
			{ semi: true },
		)
		expect(result).toBe('export type User = {\n\tname: string;\n\tage: number;\n}\n\n')
	})

	it('should use commas when comma is true', () => {
		const result = wabeClassRecordToString(
			{ User: { name: 'string', age: 'number' } },
			{ comma: true },
		)
		expect(result).toBe('export type User = {\n\tname: string,\n\tage: number,\n}\n\n')
	})

	it('should use custom indent', () => {
		const result = wabeClassRecordToString({ User: { name: 'string' } }, { indent: '  ' })
		expect(result).toBe('export type User = {\n  name: string\n}\n\n')
	})

	it('should replace "undefined" with "?" in field names', () => {
		const result = wabeClassRecordToString({
			User: { nameundefined: 'string' },
		})
		expect(result).toBe('export type User = {\n\tname?: string\n}\n\n')
	})

	it('should handle multiple types', () => {
		const result = wabeClassRecordToString({
			User: { id: 'string' },
			Post: { title: 'string' },
		})
		expect(result).toContain('export type User')
		expect(result).toContain('export type Post')
	})
})

describe('wabeEnumRecordToString', () => {
	it('should output enum with single-quoted values by default', () => {
		const result = wabeEnumRecordToString({
			Status: { ACTIVE: 'active', INACTIVE: 'inactive' },
		})
		expect(result).toContain("ACTIVE = 'active'")
		expect(result).toContain("INACTIVE = 'inactive'")
	})

	it('should use double quotes when specified', () => {
		const result = wabeEnumRecordToString({ Status: { ACTIVE: 'active' } }, { quote: 'double' })
		expect(result).toContain('ACTIVE = "active"')
	})

	it('should default to comma as endChar for enums', () => {
		const result = wabeEnumRecordToString({ Status: { A: 'a', B: 'b' } })
		expect(result).toBe("export enum Status {\n\tA = 'a',\n\tB = 'b',\n}\n\n")
	})

	it('should use semicolons when semi is true', () => {
		const result = wabeEnumRecordToString({ Status: { A: 'a', B: 'b' } }, { semi: true })
		expect(result).toBe("export enum Status {\n\tA = 'a';\n\tB = 'b';\n}\n\n")
	})

	it('should suppress comma when comma is explicitly false', () => {
		const result = wabeEnumRecordToString({ Status: { A: 'a', B: 'b' } }, { comma: false })
		expect(result).toBe("export enum Status {\n\tA = 'a'\n\tB = 'b'\n}\n\n")
	})

	it('should handle empty values', () => {
		const result = wabeEnumRecordToString({ Empty: {} })
		expect(result).toBe('export enum Empty {\n\n}\n\n')
	})

	it('should use custom indent', () => {
		const result = wabeEnumRecordToString({ Status: { A: 'a' } }, { indent: '    ' })
		expect(result).toContain("    A = 'a'")
	})
})

describe('wabeScalarRecordToString', () => {
	it('should output type aliases for scalars', () => {
		const result = wabeScalarRecordToString({
			JSON: 'string',
			URL: 'string',
		})
		expect(result).toBe('export type JSON = string\n\nexport type URL = string\n\n')
	})

	it('should return empty string for empty input', () => {
		expect(wabeScalarRecordToString({})).toBe('')
	})
})

describe('wrapLongGraphqlFieldArguments', () => {
	it('should not wrap lines shorter than printWidth', () => {
		const content = '  myField(arg1: String): Boolean'
		const result = wrapLongGraphqlFieldArguments({
			content,
			indent: '  ',
			printWidth: 100,
		})
		expect(result).toBe(content)
	})

	it('should wrap long lines with multiple arguments', () => {
		const content = '  createUser(name: String!, email: String!, age: Int): User'
		const result = wrapLongGraphqlFieldArguments({
			content,
			indent: '  ',
			printWidth: 30,
		})
		expect(result).toContain('createUser(\n')
		expect(result).toContain('    name: String!\n')
		expect(result).toContain('    email: String!\n')
		expect(result).toContain('    age: Int\n')
		expect(result).toContain('  ): User')
	})

	it('should not wrap single-arg lines even if long', () => {
		const content = '  myField(veryLongArgumentName: String!): Boolean'
		const result = wrapLongGraphqlFieldArguments({
			content,
			indent: '  ',
			printWidth: 10,
		})
		expect(result).toBe(content)
	})

	it('should leave non-field lines unchanged', () => {
		const content = 'type Query { }'
		const result = wrapLongGraphqlFieldArguments({
			content,
			indent: '  ',
			printWidth: 5,
		})
		expect(result).toBe(content)
	})

	it('should handle multiple lines independently', () => {
		const content = 'short\n  longField(a: A!, b: B!, c: C!): D'
		const result = wrapLongGraphqlFieldArguments({
			content,
			indent: '\t',
			printWidth: 20,
		})
		const lines = result.split('\n')
		expect(lines[0]).toBe('short')
		expect(lines.length).toBeGreaterThan(2)
	})
})

describe('generateWabeDevTypes', () => {
	it('should produce empty scalar type when no scalars', () => {
		const result = generateWabeDevTypes({ classes: [] })
		expect(result).toContain("export type WabeSchemaScalars = ''")
	})

	it('should list scalars as union', () => {
		const result = generateWabeDevTypes({
			classes: [],
			scalars: [{ name: 'JSON' }, { name: 'URL' }],
		})
		expect(result).toContain("export type WabeSchemaScalars = 'JSON' | 'URL'")
	})

	it('should use double quotes for scalars', () => {
		const result = generateWabeDevTypes({
			classes: [],
			scalars: [{ name: 'JSON' }],
			options: { quote: 'double' },
		})
		expect(result).toContain('export type WabeSchemaScalars = "JSON"')
	})

	it('should produce WabeSchemaEnums for enums', () => {
		const result = generateWabeDevTypes({
			classes: [],
			enums: [{ name: 'Status', values: { A: 'a' } }],
		})
		expect(result).toContain('export type WabeSchemaEnums')
		expect(result).toContain('Status: Status')
	})

	it('should produce WabeSchemaTypes for classes', () => {
		const result = generateWabeDevTypes({
			classes: [{ name: 'User', fields: {} }] as any,
		})
		expect(result).toContain('export type WabeSchemaTypes')
		expect(result).toContain('User: User')
	})

	it('should produce WabeSchemaWhereTypes for classes', () => {
		const result = generateWabeDevTypes({
			classes: [{ name: 'User', fields: {} }] as any,
		})
		expect(result).toContain('export type WabeSchemaWhereTypes')
		expect(result).toContain('User: WhereUser')
	})

	it('should use semicolons when semi is true', () => {
		const result = generateWabeDevTypes({
			classes: [{ name: 'User', fields: {} }] as any,
			enums: [{ name: 'Status', values: { A: 'a' } }],
			options: { semi: true },
		})
		expect(result).toContain('User: User;')
		expect(result).toContain('Status: Status;')
	})

	it('should use custom indent', () => {
		const result = generateWabeDevTypes({
			classes: [{ name: 'User', fields: {} }] as any,
			options: { indent: '    ' },
		})
		expect(result).toContain('    User: User')
	})

	it('should return empty strings for empty enums/classes', () => {
		const result = generateWabeDevTypes({ classes: [], enums: [] })
		expect(result).not.toContain('WabeSchemaEnums')
		expect(result).not.toContain('WabeSchemaTypes')
		expect(result).not.toContain('WabeSchemaWhereTypes')
	})
})
