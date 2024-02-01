interface EnumValue {
    name: string
    description: string | null
}

interface Field {
    name: string | null
    description: string | null
    type: Type
    args: Args[]
}

interface InputField extends Field {}

interface Args {
    name: string | null
    description: string | null
    type: Type
}

interface Type {
    name: string | null
    description: string | null
    kind: 'LIST' | 'NON_NULL' | 'OBJECT' | 'SCALAR' | 'ENUM' | 'INPUT_OBJECT'
    ofType: Type | null
    fields: Field[]
    inputFields: InputField[]
    enumValues: EnumValue[]
}

const getDescription = (description: string | null) =>
    `${description ? '"""\n\t' : ''}${description ? description : ''}${description ? '\n\t"""\n\t' : ''}`

const constructField = (field: InputField | Field | Args) => {
    const nameOfType =
        field.type.name ||
        field.type?.ofType?.name ||
        field.type.ofType?.ofType?.name ||
        field.type.ofType?.ofType?.ofType?.name

    const isOutputRequired = field.type.kind === 'NON_NULL'
    const isOutputTypeArray =
        field.type.kind === 'LIST' || field.type.ofType?.kind === 'LIST'

    if (isOutputTypeArray) {
        const isTypeOfArrayRequired = isOutputRequired
            ? field.type.ofType?.ofType?.kind === 'NON_NULL'
            : field.type.ofType?.kind === 'NON_NULL'

        return `[${nameOfType}${isTypeOfArrayRequired ? '!' : ''}]${isOutputRequired ? '!' : ''}`
    }

    return `${nameOfType}${isOutputRequired ? '!' : ''}`
}

const getScalars = (types: Type[]) => {
    return types
        .filter((type) => type.kind === 'SCALAR')
        .map((type) => {
            return `scalar ${type.name}`
        })
}

const getEnums = (types: Type[]) => {
    return types
        .filter((type) => type.kind === 'ENUM')
        .map((type) => {
            const fields = type.enumValues.map((value) => {
                return `${value.name}`
            })

            return `enum ${type.name} {\n\t${fields.join(',\n\t')}\n}`
        })
}

const getQueriesOrMutations = (types: Type[], kind: 'Query' | 'Mutation') => {
    const onlyQueryOrMutation = types.find((type) => type.name === kind)

    if (!onlyQueryOrMutation) throw new Error(`No ${kind} type found`)

    const fieldsOfOneQueryOrMutation = onlyQueryOrMutation.fields.map(
        (field) => {
            const queryName = field.name
            const queryDescription = getDescription(field.description)

            const args = field.args.map((arg) => {
                const argName = arg.name
                const argType = arg.type.name
                    ? arg.type.name
                    : arg.type?.ofType?.name
                const argKind = arg.type.kind

                return `${argName}: ${constructField(arg)}`
            })

            return `${queryDescription}${queryName}(${args.join(', ')}): ${constructField(field)}`
        },
    )

    return `type ${kind} {\n\t${fieldsOfOneQueryOrMutation.join('\n\t')}\n}`
}

const getInputObjects = (types: Type[]) => {
    const onlyInputObjects = types.filter(
        (type) => type.kind === 'INPUT_OBJECT',
    )

    const allInputObjects = onlyInputObjects.map((inputObject) => {
        const inputObjectName = inputObject.name
        const inputObjectDescription = getDescription(inputObject.description)

        const fields = inputObject.inputFields.map(
            (field) => `${field.name}: ${constructField(field)}`,
        )

        return `${inputObjectDescription}input ${inputObjectName} {\n\t${fields.join('\n\t')}\n}`
    })

    return allInputObjects.join('\n')
}

const getObjects = (types: Type[]) => {
    const onlyObjects = types.filter((type) => type.kind === 'OBJECT')

    const allObjects = onlyObjects.map((object) => {
        const objectName = object.name
        const objectDescription = getDescription(object.description)

        const fields = object.fields.map(
            (field) => `${field.name}: ${constructField(field)}`,
        )

        return `${objectDescription}type ${objectName} {\n\t${fields.join('\n\t')}\n}`
    })

    return allObjects.join('\n')
}

export const getGraphqlSchema = async (urlEndpoint: string) => {
    const res = await fetch(urlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `
                query IntrospectionSchema {
                    __schema {
                        types {
                            name
                            description
                            kind
                            enumValues {
                                name
                                description
                            }
                            inputFields {
                                name
                                type {
                                    name
                                    kind
                                    ofType {
                                        name
                                        kind
                                        ofType {
                                            name
                                            kind
                                        }
                                    }
                                }
                            }
                            fields {
                                name
                                description
                                type {
                                    name
                                    kind
                                    ofType {
                                        name
                                    }
                                }
                                args {
                                    name
                                    description
                                    type {
                                        name
                                        kind
                                        ofType {
                                            name
                                            kind
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `,
        }),
    })

    const {
        data: {
            __schema: { types: objectTypes },
        },
    } = (await res.json()) as { data: { __schema: { types: Type[] } } }

    const objectTypesCleaned = objectTypes.filter(
        (type) => !type?.name?.startsWith('__'),
    )

    const scalars = getScalars(objectTypesCleaned)
    const enums = getEnums(objectTypesCleaned)
    const queries = getQueriesOrMutations(objectTypesCleaned, 'Query')
    const mutations = getQueriesOrMutations(objectTypesCleaned, 'Mutation')
    const inputObjects = getInputObjects(objectTypesCleaned)
    const objects = getObjects(objectTypesCleaned)

    return { scalars, enums, queries, mutations, inputObjects, objects }
}
