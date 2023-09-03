import type { GraphQLParams } from '../../types.js';
import type { Plugin } from '../types.js';
export declare function assertInvalidParams(params: unknown): asserts params is GraphQLParams;
export declare function checkGraphQLQueryParams(params: unknown): GraphQLParams;
export declare function isValidGraphQLParams(params: unknown): params is GraphQLParams;
export declare function useCheckGraphQLQueryParams(): Plugin;
