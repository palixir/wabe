import { GraphQLSchema, OperationDefinitionNode } from 'graphql';
import { ClientSideBasePluginConfig, ClientSideBaseVisitor, LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { RawGraphQLRequestPluginConfig } from './config.js';
export interface GraphQLRequestPluginConfig extends ClientSideBasePluginConfig {
    rawRequest: boolean;
    extensionsType: string;
}
export declare class GraphQLRequestVisitor extends ClientSideBaseVisitor<RawGraphQLRequestPluginConfig, GraphQLRequestPluginConfig> {
    private _externalImportPrefix;
    private _operationsToInclude;
    constructor(schema: GraphQLSchema, fragments: LoadedFragment[], rawConfig: RawGraphQLRequestPluginConfig);
    OperationDefinition(node: OperationDefinitionNode): string;
    protected buildOperation(node: OperationDefinitionNode, documentVariableName: string, operationType: string, operationResultType: string, operationVariablesTypes: string): string;
    private getDocumentNodeVariable;
    get sdkContent(): string;
}
