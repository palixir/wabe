import {
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLBoolean,
  GraphQLString,
} from 'graphql'
import { pluralize } from 'wabe-pluralize'
import type { WabeTypes } from '..'
import type {
  ClassInterface,
  MutationResolver,
  QueryResolver,
  Schema,
  SchemaFields,
} from '../schema'
import { firstLetterInLowerCase } from '../utils'
import type { DevWabeTypes } from '../utils/helper'
import { GraphqlParser, type GraphqlParserFactory } from './parser'
import {
  mutationToCreateMultipleObjects,
  mutationToCreateObject,
  mutationToDeleteMultipleObjects,
  mutationToDeleteObject,
  mutationToUpdateMultipleObjects,
  mutationToUpdateObject,
  queryForMultipleObject,
  queryForOneObject,
} from './resolvers'
import {
  DateScalarType,
  FileScalarType,
  IdWhereInput,
  SearchWhereInput,
} from './types'

type AllPossibleObject =
  | 'object'
  | 'inputObject'
  | 'whereInputObject'
  | 'connectionObject'
  | 'pointerInputObject'
  | 'relationInputObject'
  | 'updateInputObject'
  | 'createInputObject'
  | 'orderEnumType'

export type AllObjects = Record<string, Partial<Record<AllPossibleObject, any>>>

export class GraphQLSchema {
  private schemas: Schema<DevWabeTypes>

  private allObjects: AllObjects

  constructor(schemas: Schema<any>) {
    this.schemas = schemas
    this.allObjects = {}
  }

  createSchema() {
    if (!this.schemas) throw new Error('Schema not found')

    const scalars = this.createScalars()
    const enums = this.createEnums()

    const classes = this.schemas.schema.classes || []

    const graphqlParser = GraphqlParser({ scalars, enums })

    classes.map((wabeClass) =>
      this.createCompleteObject(graphqlParser, wabeClass),
    )

    const queriesMutationAndObjects = classes.reduce(
      (acc, current) => {
        const className = current.name.replace(' ', '')

        const currentObject = this.allObjects[className]

        if (!currentObject) throw new Error('Object not found')

        const {
          object,
          inputObject,
          pointerInputObject,
          relationInputObject,
          createInputObject,
          updateInputObject,
          whereInputObject,
          connectionObject,
          orderEnumType,
        } = currentObject

        // Queries
        const defaultQueries = this.createDefaultQueries({
          className,
          whereInputType: whereInputObject,
          object,
          connectionObject,
          orderEnumType,
        })

        const defaultMutations = this.createDefaultMutations({
          className,
          whereInputType: whereInputObject,
          object,
          connectionObject,
          defaultUpdateInputType: updateInputObject,
          defaultCreateInputType: createInputObject,
          orderEnumType,
        })

        const defaultQueriesKeys = Object.keys(defaultQueries)
        const defaultMutationsKeys = Object.keys(defaultMutations)

        // Loop to avoid O(n)² complexity of spread on accumulator
        for (const key in defaultQueriesKeys) {
          acc.queries[defaultQueriesKeys[key]] =
            defaultQueries[defaultQueriesKeys[key]]
        }

        for (const key in defaultMutationsKeys) {
          acc.mutations[defaultMutationsKeys[key]] =
            defaultMutations[defaultMutationsKeys[key]]
        }

        acc.objects.push(object)
        acc.objects.push(inputObject)
        acc.objects.push(pointerInputObject)
        acc.objects.push(relationInputObject)

        return acc
      },
      {
        queries: {},
        mutations: {},
        objects: [...this.createFileObjects()],
      } as {
        queries: Record<string, GraphQLFieldConfig<any, any, any>>
        mutations: Record<string, GraphQLFieldConfig<any, any, any>>
        objects: Array<GraphQLObjectType | GraphQLInputObjectType>
      },
    )

    const customQueries = this.createCustomQueries({
      resolvers: this.schemas.schema.resolvers?.queries || {},
      graphqlParser,
    })
    const customQueriesKeys = Object.keys(customQueries)

    for (const key in customQueriesKeys) {
      queriesMutationAndObjects.queries[customQueriesKeys[key]] =
        customQueries[customQueriesKeys[key]]
    }

    // Mutations
    const customMutations = this.createCustomMutations({
      resolvers: this.schemas.schema.resolvers?.mutations || {},
      graphqlParser,
    })
    const customMutationsKeys = Object.keys(customMutations)

    for (const key in customMutationsKeys) {
      queriesMutationAndObjects.mutations[customMutationsKeys[key]] =
        customMutations[customMutationsKeys[key]]
    }

    return {
      queries: queriesMutationAndObjects.queries,
      mutations: queriesMutationAndObjects.mutations,
      scalars,
      enums,
      objects: queriesMutationAndObjects.objects,
    }
  }

  createFileObjects() {
    const fileInfoObject = new GraphQLObjectType({
      name: 'FileInfo',
      description: 'Object containing information about the file',
      fields: () => ({
        name: { type: GraphQLString },
        url: { type: GraphQLString },
        urlGeneratedAt: {
          type: DateScalarType,
        },
      }),
    })

    const fileInputObject = new GraphQLInputObjectType({
      name: 'FileInput',
      description: 'Input to create a file',
      fields: () => ({
        file: { type: FileScalarType },
        url: { type: GraphQLString },
      }),
    })

    this.allObjects.FileInfo = {
      object: fileInfoObject,
      inputObject: fileInputObject,
    }

    return [fileInfoObject]
  }

  createScalars() {
    return (
      this.schemas.schema.scalars?.map(
        (scalar) =>
          new GraphQLScalarType({
            ...scalar,
          }),
      ) || []
    )
  }

  createOrderEnumType(wabeClass: ClassInterface<DevWabeTypes>) {
    const fields = wabeClass.fields

    const classEnums = Object.keys(fields).reduce(
      (acc, fieldName) => {
        acc[`${fieldName}_ASC`] = { value: { [fieldName]: 'ASC' } }
        acc[`${fieldName}_DESC`] = { value: { [fieldName]: 'DESC' } }

        return acc
      },
      {} as Record<string, any>,
    )

    return new GraphQLEnumType({
      name: `${wabeClass.name}Order`,
      values: classEnums,
    })
  }

  createEnums() {
    return (
      this.schemas.schema.enums?.map((wabeEnum) => {
        const enumValues = wabeEnum.values

        const values = Object.keys(enumValues).reduce(
          (acc, value) => {
            acc[value] = { value: enumValues[value] }

            return acc
          },
          {} as Record<string, any>,
        )

        return new GraphQLEnumType({
          ...wabeEnum,
          values,
        })
      }) || []
    )
  }

  createObject({
    wabeClass,
    graphqlParser,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    const { name, fields, description } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    const graphqlParserWithInput = graphqlParser({
      schemaFields: fields,
      graphqlObjectType: 'Object',
      allObjects: this.allObjects,
    })

    return new GraphQLObjectType({
      name: nameWithoutSpace,
      description,
      // We need to use function here to have lazy loading of fields
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        ...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
      }),
    })
  }

  createPointerInputObject({
    wabeClass,
    inputCreateFields,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    inputCreateFields: GraphQLInputObjectType
  }) {
    const { name } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    return new GraphQLInputObjectType({
      name: `${nameWithoutSpace}PointerInput`,
      description: `Input to link an object to a pointer ${nameWithoutSpace}`,
      fields: () => ({
        unlink: { type: GraphQLBoolean },
        link: { type: GraphQLID },
        createAndLink: { type: inputCreateFields },
      }),
    })
  }

  createRelationInputObject({
    wabeClass,
    inputCreateFields,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    inputCreateFields: GraphQLInputObjectType
  }) {
    const { name } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    return new GraphQLInputObjectType({
      name: `${nameWithoutSpace}RelationInput`,
      description: `Input to add a relation to the class ${nameWithoutSpace}`,
      fields: () => ({
        add: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
        remove: {
          type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        createAndAdd: {
          type: new GraphQLList(new GraphQLNonNull(inputCreateFields)),
        },
      }),
    })
  }

  createInputObject({
    wabeClass,
    graphqlParser,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    const { name, fields, description } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    const graphqlParserWithInput = graphqlParser({
      schemaFields: fields,
      graphqlObjectType: 'InputObject',
      allObjects: this.allObjects,
    })

    return new GraphQLInputObjectType({
      name: `${nameWithoutSpace}Input`,
      description,
      fields: () => ({
        ...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
      }),
    })
  }

  createCreateInputObject({
    wabeClass,
    graphqlParser,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    const { name, fields, description } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    const graphqlParserWithInput = graphqlParser({
      schemaFields: fields,
      graphqlObjectType: 'CreateFieldsInput',
      allObjects: this.allObjects,
    })

    return new GraphQLInputObjectType({
      name: `${nameWithoutSpace}CreateFieldsInput`,
      description,
      fields: () => ({
        ...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
      }),
    })
  }

  createUpdateInputObject({
    wabeClass,
    graphqlParser,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    const { name, fields, description } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    const graphqlParserWithInput = graphqlParser({
      schemaFields: fields,
      graphqlObjectType: 'UpdateFieldsInput',
      allObjects: this.allObjects,
    })

    return new GraphQLInputObjectType({
      name: `${nameWithoutSpace}UpdateFieldsInput`,
      description,
      fields: () => ({
        ...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
      }),
    })
  }

  createWhereInputObject({
    wabeClass,
    graphqlParser,
  }: {
    wabeClass: ClassInterface<DevWabeTypes>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    const { name, fields, description } = wabeClass

    const nameWithoutSpace = name.replace(' ', '')

    const graphqlParserWithInput = graphqlParser({
      schemaFields: fields,
      graphqlObjectType: 'WhereInputObject',
      allObjects: this.allObjects,
    })

    const inputObject = new GraphQLInputObjectType({
      name: `${nameWithoutSpace}WhereInput`,
      description,
      fields: (): any => ({
        id: { type: IdWhereInput },
        ...graphqlParserWithInput.getGraphqlFields(nameWithoutSpace),
        ...{
          OR: {
            type: new GraphQLList(inputObject),
          },
          AND: {
            type: new GraphQLList(inputObject),
          },
        },
        search: { type: SearchWhereInput },
      }),
    })

    return inputObject
  }

  createConnectionObject({
    object,
    wabeClass,
  }: {
    object: GraphQLObjectType
    wabeClass: ClassInterface<DevWabeTypes>
  }) {
    const edgeObject = new GraphQLObjectType({
      name: `${wabeClass.name}Edge`,
      fields: () => ({
        node: { type: new GraphQLNonNull(object) },
      }),
    })

    const connectionObject = new GraphQLObjectType({
      name: `${wabeClass.name}Connection`,
      fields: () => ({
        totalCount: { type: GraphQLInt },
        edges: { type: new GraphQLList(edgeObject) },
      }),
    })

    return connectionObject
  }

  createCompleteObject(
    graphqlParser: GraphqlParserFactory<DevWabeTypes>,
    wabeClass: ClassInterface<DevWabeTypes>,
  ) {
    const object = this.createObject({ graphqlParser, wabeClass })

    const connectionObject = this.createConnectionObject({
      object,
      wabeClass,
    })

    const inputObject = this.createInputObject({
      graphqlParser,
      wabeClass,
    })

    const createInputObject = this.createCreateInputObject({
      graphqlParser,
      wabeClass,
    })

    const pointerInputObject = this.createPointerInputObject({
      inputCreateFields: createInputObject,
      wabeClass,
    })

    const relationInputObject = this.createRelationInputObject({
      inputCreateFields: createInputObject,
      wabeClass,
    })

    const updateInputObject = this.createUpdateInputObject({
      graphqlParser,
      wabeClass,
    })

    const whereInputObject = this.createWhereInputObject({
      graphqlParser,
      wabeClass,
    })

    const orderEnumType = this.createOrderEnumType(wabeClass)

    this.allObjects[wabeClass.name] = {
      connectionObject,
      createInputObject,
      updateInputObject,
      whereInputObject,
      pointerInputObject,
      relationInputObject,
      inputObject,
      object,
      orderEnumType,
    }
  }

  _getGraphQLOutputType(
    currentQueryOrMutation:
      | QueryResolver<DevWabeTypes>
      | MutationResolver<DevWabeTypes>,
    graphqlParser: GraphqlParserFactory<DevWabeTypes>,
    currentArgs: SchemaFields<DevWabeTypes>,
  ): GraphQLOutputType | undefined {
    if (currentQueryOrMutation.type === 'Object') {
      const objectGraphqlParser = graphqlParser({
        schemaFields: currentQueryOrMutation.outputObject.fields,
        graphqlObjectType: 'Object',
        allObjects: this.allObjects,
      })

      return new GraphQLObjectType({
        name: currentQueryOrMutation.outputObject.name,
        fields: () =>
          objectGraphqlParser.getGraphqlFields(
            currentQueryOrMutation.outputObject.name,
          ),
      })
    }

    if (
      currentQueryOrMutation.type === 'Array' &&
      currentQueryOrMutation.typeValue === 'Object'
    ) {
      const outputObject = graphqlParser({
        schemaFields: currentQueryOrMutation.outputObject.fields,
        graphqlObjectType: 'Object',
        allObjects: this.allObjects,
      })

      const graphqlObject = new GraphQLObjectType({
        name: currentQueryOrMutation.outputObject.name,
        fields: () =>
          outputObject.getGraphqlFields(
            currentQueryOrMutation.outputObject.name,
          ),
      })

      return new GraphQLList(
        currentQueryOrMutation.typeValueRequired
          ? new GraphQLNonNull(graphqlObject)
          : graphqlObject,
      )
    }

    const graphqlParserWithInput = graphqlParser({
      schemaFields: currentArgs,
      graphqlObjectType: 'Object',
      allObjects: this.allObjects,
    })

    return graphqlParserWithInput.getGraphqlType(currentQueryOrMutation)
  }

  createCustomMutations({
    resolvers,
    graphqlParser,
  }: {
    resolvers: Record<string, MutationResolver<DevWabeTypes>>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    return Object.keys(resolvers).reduce(
      (acc, currentKey) => {
        const currentMutation = resolvers[currentKey]
        const required = !!currentMutation.required
        const input = currentMutation.args?.input || {}
        const numberOfFieldsInInput = Object.keys(input).length

        const currentKeyWithFirstLetterUpperCase = `${currentKey[0].toUpperCase()}${currentKey.slice(
          1,
        )}`

        const graphqlParserWithInput = graphqlParser({
          schemaFields: input,
          graphqlObjectType: 'InputObject',
          allObjects: this.allObjects,
        })

        const outputType = this._getGraphQLOutputType(
          currentMutation,
          graphqlParser,
          input,
        )

        if (!outputType) throw new Error('Invalid mutation output type')

        const graphqlInput = new GraphQLInputObjectType({
          name: `${currentKeyWithFirstLetterUpperCase}Input`,
          fields: graphqlParserWithInput.getGraphqlFields(
            currentKeyWithFirstLetterUpperCase,
          ),
        })

        acc[currentKey] = {
          type: required ? new GraphQLNonNull(outputType) : outputType,
          args:
            numberOfFieldsInInput > 0
              ? { input: { type: new GraphQLNonNull(graphqlInput) } }
              : undefined,
          description: currentMutation.description,
          resolve: currentMutation.resolve,
        }

        return acc
      },
      {} as Record<string, GraphQLFieldConfig<any, any, any>>,
    )
  }

  createCustomQueries({
    resolvers,
    graphqlParser,
  }: {
    resolvers: Record<string, QueryResolver<DevWabeTypes>>
    graphqlParser: GraphqlParserFactory<DevWabeTypes>
  }) {
    return Object.keys(resolvers).reduce(
      (acc, currentKey) => {
        const currentQuery = resolvers[currentKey]
        const required = !!currentQuery.required
        const currentArgs = currentQuery.args || {}

        const graphqlParserWithInput = graphqlParser({
          schemaFields: currentArgs,
          graphqlObjectType: 'Object',
          allObjects: this.allObjects,
        })

        const outputType = this._getGraphQLOutputType(
          currentQuery,
          graphqlParser,
          currentArgs,
        )

        if (!outputType) throw new Error('Invalid mutation output type')

        acc[currentKey] = {
          type: required ? new GraphQLNonNull(outputType) : outputType,
          args: graphqlParserWithInput.getGraphqlFields(currentKey),
          description: currentQuery.description,
          resolve: currentQuery.resolve,
        }

        return acc
      },
      {} as Record<string, GraphQLFieldConfig<any, any, any>>,
    )
  }

  createDefaultQueries({
    className,
    whereInputType,
    object,
    connectionObject,
    orderEnumType,
  }: {
    className: string
    whereInputType: GraphQLInputObjectType
    object: GraphQLObjectType
    connectionObject: GraphQLObjectType
    orderEnumType: GraphQLEnumType
  }) {
    const classNameWithFirstLetterLowerCase = firstLetterInLowerCase(className)

    return {
      [classNameWithFirstLetterLowerCase]: {
        type: object,
        description: object.description,
        args: { id: { type: GraphQLID } },
        resolve: (root, args, ctx, info) =>
          queryForOneObject(root, args, ctx, info, className),
      },
      [pluralize(classNameWithFirstLetterLowerCase)]: {
        type: new GraphQLNonNull(connectionObject),
        description: object.description,
        args: {
          where: { type: whereInputType },
          offset: { type: GraphQLInt },
          first: { type: GraphQLInt },
          order: { type: new GraphQLList(new GraphQLNonNull(orderEnumType)) },
        },
        resolve: (root, args, ctx, info) =>
          queryForMultipleObject(root, args, ctx, info, className),
      },
    } as Record<string, GraphQLFieldConfig<any, any, any>>
  }

  createDefaultMutations({
    className,
    object,
    defaultUpdateInputType,
    defaultCreateInputType,
    whereInputType,
    connectionObject,
    orderEnumType,
  }: {
    className: string
    defaultUpdateInputType: GraphQLInputObjectType
    defaultCreateInputType: GraphQLInputObjectType
    whereInputType: GraphQLInputObjectType
    object: GraphQLObjectType
    connectionObject: GraphQLObjectType
    orderEnumType: GraphQLEnumType
  }) {
    const classNameWithFirstLetterLowerCase = firstLetterInLowerCase(className)

    const pluralClassName = pluralize(className)

    const createPayloadType = new GraphQLObjectType({
      name: `Create${className}Payload`,
      fields: () => ({
        [classNameWithFirstLetterLowerCase]: { type: object },
        ok: { type: GraphQLBoolean },
      }),
    })

    const createInputType = new GraphQLInputObjectType({
      name: `Create${className}Input`,
      fields: () => ({
        fields: { type: defaultCreateInputType },
      }),
    })

    const createsInputType = new GraphQLInputObjectType({
      name: `Create${pluralClassName}Input`,
      fields: () => ({
        fields: {
          type: new GraphQLNonNull(new GraphQLList(defaultCreateInputType)),
        },
        offset: { type: GraphQLInt },
        first: { type: GraphQLInt },
        order: { type: new GraphQLList(orderEnumType) },
      }),
    })

    const updatePayloadType = new GraphQLObjectType({
      name: `Update${className}Payload`,
      fields: () => ({
        [classNameWithFirstLetterLowerCase]: { type: object },
        ok: { type: GraphQLBoolean },
      }),
    })

    const updateInputType = new GraphQLInputObjectType({
      name: `Update${className}Input`,
      fields: () => ({
        id: { type: GraphQLID },
        fields: { type: defaultUpdateInputType },
      }),
    })

    const updatesInputType = new GraphQLInputObjectType({
      name: `Update${pluralClassName}Input`,
      fields: () => ({
        fields: { type: defaultUpdateInputType },
        where: { type: whereInputType },
        offset: { type: GraphQLInt },
        first: { type: GraphQLInt },
        order: { type: new GraphQLList(orderEnumType) },
      }),
    })

    const deletePayloadType = new GraphQLObjectType({
      name: `Delete${className}Payload`,
      fields: () => ({
        [classNameWithFirstLetterLowerCase]: { type: object },
        ok: { type: GraphQLBoolean },
      }),
    })

    const deleteInputType = new GraphQLInputObjectType({
      name: `Delete${className}Input`,
      fields: () => ({
        id: { type: GraphQLID },
      }),
    })

    const deletesInputType = new GraphQLInputObjectType({
      name: `Delete${pluralClassName}Input`,
      fields: () => ({
        where: { type: whereInputType },
        order: { type: new GraphQLList(orderEnumType) },
      }),
    })

    return {
      [`create${className}`]: {
        type: createPayloadType,
        description: object.description,
        args: { input: { type: new GraphQLNonNull(createInputType) } },
        resolve: (root, args, ctx, info) =>
          mutationToCreateObject(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
      [`create${pluralize(className)}`]: {
        type: new GraphQLNonNull(connectionObject),
        description: object.description,
        args: { input: { type: new GraphQLNonNull(createsInputType) } },
        resolve: (root, args, ctx, info) =>
          mutationToCreateMultipleObjects(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
      [`update${className}`]: {
        type: updatePayloadType,
        description: object.description,
        args: { input: { type: new GraphQLNonNull(updateInputType) } },
        resolve: (root, args, ctx, info) =>
          mutationToUpdateObject(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
      [`update${pluralize(className)}`]: {
        type: new GraphQLNonNull(connectionObject),
        description: object.description,
        args: { input: { type: new GraphQLNonNull(updatesInputType) } },
        resolve: (root, args, ctx, info) =>
          mutationToUpdateMultipleObjects(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
      [`delete${className}`]: {
        type: deletePayloadType,
        description: object.description,
        args: {
          input: {
            type: new GraphQLNonNull(deleteInputType),
          },
        },
        resolve: (root, args, ctx, info) =>
          mutationToDeleteObject(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
      [`delete${pluralize(className)}`]: {
        type: new GraphQLNonNull(connectionObject),
        description: object.description,
        args: { input: { type: new GraphQLNonNull(deletesInputType) } },
        resolve: (root, args, ctx, info) =>
          mutationToDeleteMultipleObjects(
            root,
            args,
            ctx,
            info,
            className as keyof WabeTypes['types'],
          ),
      },
    } as Record<string, GraphQLFieldConfig<any, any, any>>
  }
}
