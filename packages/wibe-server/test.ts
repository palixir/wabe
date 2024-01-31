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
                                        ofType{
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
      __schema: { queryType, mutationType, types: objectTypes },
    },
  } = await res.json()

  const scalars = objectTypes.filter((type: any) => !type.name.startsWith('__') && type.kind === 'SCALAR').map((type: any) => {
    return `scalar ${type.name}`
  })

  const enums = objectTypes.filter((type: any) => !type.name.startsWith('__') && type.kind === 'ENUM').map((type: any) => {
    const fields = type.enumValues.map((value: any) => {
      return `${value.name}`
    })

    return `enum ${type.name} {\n\t${fields.join(',\n\t')}\n}`
  })


  const types = objectTypes.filter((type: any) => type.kind !== 'ENUM' && type.kind !== 'SCALAR' && !type.name.startsWith('__')).map((type: any) => {
    const description = `${type.description ? '"""\n' : ''}${type.description ? type.description : ''}${type.description ? '"""\n' : ''}`

    if (type.name === 'Query' || type.name === 'Mutation') {
      const queries = type.fields.map((field: any) => {
        const args = field.args.map((arg: any) => {
          return `${arg.name}: ${arg.type.name ? arg.type.name : arg.type.ofType.name}${arg.type.kind === 'NON_NULL' ? '!' : ''}`
        })

        return `${field.name}(${args.join(', ')}): ${field.type.name ? field.type.name : field.type.ofType.name}${field.type.kind === 'NON_NULL' ? '!' : ''}`
      })

      return `${description}type ${type.name} {\n\t${queries.join('\n\t')}\n}`
    }

    if (type.kind === 'INPUT_OBJECT') {
      const getTypeName = (field: any) => {
        if (field.type.ofType.name)
          return field.type.ofType.name

        return field.type.ofType.ofType.name
      }

      const fields = type.inputFields.map((field: any) => {
        return `${field.name}: ${field.type.name ? field.type.name : ('[' + getTypeName(field) + ']')}${field.type.kind === 'NON_NULL' ? '!' : ''}`
      })

      return `${description}input ${type.name} { \n\t${fields.join(',\n\t')} \n} `
    }

    if (type.kind === 'OBJECT') {
      const fields = type.fields.map((field: any) => {
        return `${description}${field.name}: ${field.type.name ? field.type.name : field.type.ofType.name}${field.type.kind === 'NON_NULL' ? '!' : ''}`
      })

      return `${description}type ${type.name
        } { \n\t${fields.join(',\n\t')}\n}`
    }

    const fields = type.fields?.map((field: any) => {
      const args = field.args.map((arg: any) => {
        return `${arg.name}: ${arg.type.name} `
      })
    })

    return `${type.name} { ${fields.join(', ')} } `
  })

  await Bun.write('schema.graphql', `${scalars.join('\n')} \n\n${enums.join('\n\n')} \n\n${types.join('\n\n')} `)
}

run().catch((err) => {
  console.error(err)
})
