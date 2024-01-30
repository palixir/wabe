import { gql } from 'graphql-request'

const run = async () => {
    const res = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: gql`
                query IntrospectionSchema {
                    __schema {
                        types {
                            name
                            description
                            kind
                            inputFields {
                                name
                                type {
                                    name
                                    kind
                                    ofType {
                                        name
                                        kind
                                    }
                                }
                            }
                            fields {
                                name
                                description
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
                        mutationType {
                            name
                            description
                            fields {
                                name
                                description
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
                        queryType {
                            name
                            description
                            fields {
                                name
                                description
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
            `,
        }),
    })

    const {
        data: {
            __schema: { queryType, mutationType, types: objectTypes },
        },
    } = await res.json()

    const types = objectTypes.map((type: any) => {
        const fields = type.fields?.map((field: any) => {
            const args = field.args.map((arg: any) => {
                return `${arg.name}: ${arg.type.name}`
            })
        })

        if (type.kind === 'SCALAR' || type.kind === 'ENUM') {
            return `${type.name}`
        }

        if (type.kind === 'INPUT_OBJECT') {
            const fields = type.inputFields.map((field: any) => {
                return `${field.name}: ${field.type.name}`
            })

            return `${type.name} { ${fields.join(', ')} }`
        }

        return `${type.name} { ${fields.join(', ')} }`
    })

    console.log(types)

    const queries = queryType.fields.map((field: any) => {
        const args = field.args.map((arg: any) => {
            return `${arg.name}: ${arg.type.name}`
        })

        return `${field.name}(${args.join(', ')}): ${field.type.name === null ? field.type.ofType.name : field.type.name}${field.type.kind === 'NON_NULL' ? '!' : ''}`
    })

    const mutations = mutationType.fields.map((field: any) => {
        const args = field.args.map((arg: any) => {
            return `${arg.name}: ${arg.type.name}`
        })

        return `${field.name}(${args.join(', ')}): ${field.type.name === null ? field.type.ofType.name : field.type.name}${field.type.kind === 'NON_NULL' ? '!' : ''}`
    })
}

run().catch((err) => {
    console.error(err)
})
