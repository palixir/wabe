import { GetEnvelopedFn } from '@envelop/core';
import { OnResultProcess, ResultProcessorInput } from './plugins/types.cjs';
import { FetchAPI, GraphQLParams } from './types.cjs';
export declare function processResult({ request, result, fetchAPI, onResultProcessHooks, }: {
    request: Request;
    result: ResultProcessorInput;
    fetchAPI: FetchAPI;
    /**
     * Response Hooks
     */
    onResultProcessHooks: OnResultProcess[];
}): Promise<Response>;
export declare function processRequest({ params, enveloped, }: {
    params: GraphQLParams;
    enveloped: ReturnType<GetEnvelopedFn<unknown>>;
}): Promise<any>;
