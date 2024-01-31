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

                return `${argName}: ${argType}${argKind === 'NON_NULL' ? '!' : ''}`
            })

            // We can have an array of required elements
            const nameOfType =
                field.type.name ||
                field.type?.ofType?.name ||
                field.type.ofType?.ofType?.name ||
                field.type.ofType?.ofType?.ofType?.name

            const kindOfType = field.type.kind
            const kindOfArray = field.type.ofType?.ofType?.kind

            return `${queryDescription}${queryName}(${args.join(', ')}): [${nameOfType}${kindOfType === 'NON_NULL' ? '!' : ''}]${kindOfArray === 'NON_NULL' ? '!' : ''}`
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

        const fields = inputObject.inputFields.map((field) => {
            const fieldName = field.name
            const fieldType = field.type.name
                ? field.type.name
                : field.type?.ofType?.name
            const fieldKind = field.type.kind

            if (fieldKind === 'LIST') {
                const nameOfType = field.type?.ofType?.name
                const kindOfType = field.type?.ofType?.kind

                return `${fieldName}: [${nameOfType}${kindOfType === 'NON_NULL' ? '!' : ''}]`
            }

            return `${fieldName}: ${fieldType}${fieldKind === 'NON_NULL' ? '!' : ''}`
        })

        return `${inputObjectDescription}input ${inputObjectName} {\n\t${fields.join('\n\t')}\n}`
    })

    return allInputObjects.join('\n')
}

const getObjects = (types: Type[]) => {
    const onlyObjects = types.filter((type) => type.kind === 'OBJECT')

    const allObjects = onlyObjects.map((object) => {
        const objectName = object.name
        const objectDescription = getDescription(object.description)

        const fields = object.fields.map((field) => {
            const fieldName = field.name
            const fieldType = field.type.name
                ? field.type.name
                : field.type?.ofType?.name
            const fieldKind = field.type.kind

            if (fieldKind === 'LIST') {
                const nameOfType = field.type?.ofType?.name
                const kindOfType = field.type?.ofType?.kind

                return `${fieldName}: [${nameOfType}${kindOfType === 'NON_NULL' ? '!' : ''}]`
            }

            return `${fieldName}: ${fieldType}${fieldKind === 'NON_NULL' ? '!' : ''}`
        })

        return `${objectDescription}type ${objectName} {\n\t${fields.join('\n\t')}\n}`
    })
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
