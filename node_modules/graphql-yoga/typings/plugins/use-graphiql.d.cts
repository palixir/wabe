import { PromiseOrValue } from '@envelop/core';
import { YogaLogger } from '@graphql-yoga/logger';
import { Plugin } from './types.cjs';
export declare function shouldRenderGraphiQL({ headers, method }: Request): boolean;
export type GraphiQLOptions = {
    /**
     * An optional GraphQL string to use when no query is provided and no stored
     * query exists from a previous session.  If undefined is provided, GraphiQL
     * will use its own default query.
     */
    defaultQuery?: string;
    /**
     * The initial headers to render inside the header editor. Defaults to `"{}"`.
     * The value should be a JSON encoded string, for example:
     * `headers: JSON.stringify({Authorization: "Bearer your-auth-key"})`
     */
    headers?: string;
    /**
     * More info there: https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
     */
    credentials?: RequestCredentials;
    /**
     * The title to display at the top of the page. Defaults to `"Yoga GraphiQL"`.
     */
    title?: string;
    /**
     * Protocol for subscriptions
     */
    subscriptionsProtocol?: 'SSE' | 'GRAPHQL_SSE' | 'WS' | 'LEGACY_WS';
    /**
     * Extra headers you always want to pass with users' headers input
     */
    additionalHeaders?: Record<string, string>;
    /**
     * HTTP method to use when querying the original schema.
     */
    method?: 'GET' | 'POST';
    /**
     * Whether to use the GET HTTP method for queries when querying the original schema
     */
    useGETForQueries?: boolean;
};
export type GraphiQLRendererOptions = {
    /**
     * The endpoint requests should be sent. Defaults to `"/graphql"`.
     */
    endpoint?: string;
} & GraphiQLOptions;
export declare const renderGraphiQL: (opts: GraphiQLRendererOptions) => string;
export type GraphiQLOptionsFactory<TServerContext> = (request: Request, ...args: {} extends TServerContext ? [serverContext?: TServerContext | undefined] : [serverContext: TServerContext]) => PromiseOrValue<GraphiQLOptions | boolean>;
export type GraphiQLOptionsOrFactory<TServerContext> = GraphiQLOptions | GraphiQLOptionsFactory<TServerContext> | boolean;
export interface GraphiQLPluginConfig<TServerContext> {
    graphqlEndpoint: string;
    options?: GraphiQLOptionsOrFactory<TServerContext>;
    render?(options: GraphiQLRendererOptions): PromiseOrValue<BodyInit>;
    logger?: YogaLogger;
}
export declare function useGraphiQL<TServerContext extends Record<string, any>>(config: GraphiQLPluginConfig<TServerContext>): Plugin<{}, TServerContext>;
