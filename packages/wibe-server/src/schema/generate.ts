import {
    GraphQLFieldConfig,
    GraphQLEnumType,
    GraphQLObjectType,
    GraphQLScalarType,
} from 'graphql'

const getDescription = ({
    description,
    indentLevel = 1,
}: { description?: string | null; indentLevel?: 1 | 2 }) => {
    return description
        ? `"""\n${indentLevel === 2 ? '\t' : ''}${description}\n${
              indentLevel === 2 ? '\t' : ''
          }"""\n${indentLevel === 2 ? '\t' : ''}`
        : ''
}

const getScalars = (scalars: GraphQLScalarType[]) =>
    scalars.map(
        (scalar) =>
            `${getDescription({ description: scalar.description })}scalar ${
                scalar.name
            }`,
    )

const getEnums = (enums: GraphQLEnumType[]) => {
    return enums.map((enumType) => {
        const values = enumType.getValues().map((value) => value.name)

        return `${getDescription({ description: enumType.description })}enum ${
            enumType.name
        } {\n\t${values.join(',\n\t')}\n}`
    })
}

const getObjects = (objects: GraphQLObjectType<any, any>[]) => {
    return objects.map((object) => {
        const fields = Object.keys(object.getFields()).map((field) => {
            const type = object.getFields()[field].type

            return `${field}: ${type}`
        })

        return `${getDescription({ description: object.description })}type ${
            object.name
        } {\n\t${fields.join(',\n\t')}\n}`
    })
}

const getQueriesOrMutations = ({
    queriesOrMutations,
    kind,
}: {
    kind: 'Query' | 'Mutation'
    queriesOrMutations: Record<string, GraphQLFieldConfig<any, any>>
}) => {
    const allQueriesAndMutations = Object.keys(queriesOrMutations).map(
        (queryOrMutation) => {
            const type = queriesOrMutations[queryOrMutation].type
            const description = queriesOrMutations[queryOrMutation].description

            const argsKeys = Object.keys(
                queriesOrMutations[queryOrMutation].args || {},
            )

            const listOfArgs = argsKeys.map(
                (argKey) =>
                    `${argKey}: ${queriesOrMutations[queryOrMutation].args?.[
                        argKey
                    ].type.toString()}`,
            )

            return `${getDescription({
                indentLevel: 2,
                description,
            })}${queryOrMutation}(${listOfArgs.join(', ')}): ${type}`
        },
    )

    return `type ${kind} {\n\t${allQueriesAndMutations.join('\n\t')}\n}`
}

export const generateSchema = ({
    scalars,
    enums,
    objects,
    queries,
    mutations,
}: {
    scalars: GraphQLScalarType<any, any>[]
    enums: GraphQLEnumType[]
    objects: GraphQLObjectType<any, any>[]
    queries: Record<string, GraphQLFieldConfig<any, any>>
    mutations: Record<string, GraphQLFieldConfig<any, any>>
}) => {
    const scalarsTypes = getScalars(scalars || [])
    const enumsTypes = getEnums(enums || [])
    const objectsTypes = getObjects(objects || [])
    const queriesTypes = getQueriesOrMutations({
        queriesOrMutations: queries,
        kind: 'Query',
    })
    const mutationsTypes = getQueriesOrMutations({
        queriesOrMutations: mutations,
        kind: 'Mutation',
    })

    console.log(queriesTypes)
}
