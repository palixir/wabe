import { describe, expect, it } from 'bun:test'
import { Schema } from './Schema'
import { RoleEnum } from '../../generated/wabe'
import type { DevWabeTypes } from '../utils/helper'

describe('Schema', () => {
  it('should merge default class with custom class', () => {
    const schema = new Schema<DevWabeTypes>({
      schema: {
        classes: [
          {
            name: 'Class1',
            fields: {
              field1: {
                type: 'String',
              },
              field2: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class2',
            fields: {
              field3: {
                type: 'String',
              },
              field4: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class1',
            fields: {
              fields3: {
                type: 'String',
              },
            },
          },
        ],
      },
    } as any)

    expect(schema.schema?.classes?.[0]).toEqual({
      name: 'Class1',
      fields: {
        field1: {
          type: 'String',
        },
        field2: {
          type: 'Int',
        },
        fields3: {
          type: 'String',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
        search: {
          type: 'Array',
          typeValue: 'String',
        },
      },
    })

    expect(schema.schema?.classes?.[1]).toEqual({
      name: 'Class2',
      fields: {
        field3: {
          type: 'String',
        },
        field4: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
        search: {
          type: 'Array',
          typeValue: 'String',
        },
      },
    })
  })

  it('should merge default class with custom class with resolvers', () => {
    const schema = new Schema({
      schema: {
        classes: [
          {
            name: 'Class1',
            fields: {
              field1: {
                type: 'String',
              },
              field2: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class2',
            fields: {
              field3: {
                type: 'String',
              },
              field4: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class1',
            fields: {
              field1: {
                type: 'Int',
                defaultValue: 1,
              },
            },
          },
        ],
        resolvers: {
          queries: {
            getClass1: {
              type: 'String',
              resolve: () => 'Class1',
            },
            getClass2: {
              type: 'String',
              resolve: () => 'Class1',
            },
          },
        },
      },
    } as any)

    expect(schema.schema?.classes?.[0]).toEqual({
      name: 'Class1',
      fields: expect.objectContaining({
        field1: {
          type: 'Int',
          defaultValue: 1,
        },
        field2: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })

    expect(schema.schema?.classes?.[1]).toEqual({
      name: 'Class2',
      fields: expect.objectContaining({
        field3: {
          type: 'String',
        },
        field4: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })
  })

  it('should merge default class with custom class with field with same name', () => {
    const schema = new Schema({
      schema: {
        classes: [
          {
            name: 'Class1',
            fields: {
              field1: {
                type: 'String',
              },
              field2: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class2',
            fields: {
              field3: {
                type: 'String',
              },
              field4: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class1',
            fields: {
              field1: {
                type: 'Int',
                defaultValue: 1,
              },
            },
          },
        ],
      },
    } as any)

    expect(schema.schema?.classes?.[0]).toEqual({
      name: 'Class1',
      fields: expect.objectContaining({
        field1: {
          type: 'Int',
          defaultValue: 1,
        },
        field2: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })

    expect(schema.schema?.classes?.[1]).toEqual({
      name: 'Class2',
      fields: expect.objectContaining({
        field3: {
          type: 'String',
        },
        field4: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })
  })

  it('should merge default class with custom class with same different description', () => {
    const schema = new Schema({
      schema: {
        classes: [
          {
            name: 'Class1',
            description: 'Class1 description',
            fields: {
              field1: {
                type: 'String',
              },
              field2: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class2',
            fields: {
              field3: {
                type: 'String',
              },
              field4: {
                type: 'Int',
              },
            },
          },
          {
            name: 'Class1',
            description: 'new Class1 description',
            fields: {
              field1: {
                type: 'Int',
                defaultValue: 1,
              },
            },
          },
        ],
      },
    } as any)

    expect(schema.schema?.classes?.[0]).toEqual({
      name: 'Class1',
      description: 'new Class1 description',
      fields: expect.objectContaining({
        field1: {
          type: 'Int',
          defaultValue: 1,
        },
        field2: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })

    expect(schema.schema?.classes?.[1]).toEqual({
      name: 'Class2',
      fields: expect.objectContaining({
        field3: {
          type: 'String',
        },
        field4: {
          type: 'Int',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
        acl: expect.any(Object),
      }),
    })
  })

  it('should add default enums', () => {
    const schema = new Schema({
      schema: {
        classes: [],
        enums: [
          {
            name: 'EnumTest',
            values: {
              A: 'A',
              B: 'B',
            },
          },
        ],
      },
    } as any)

    expect(schema.schema.enums).toEqual(
      expect.arrayContaining([
        {
          name: 'EnumTest',
          values: {
            A: 'A',
            B: 'B',
          },
        },
        {
          name: 'AuthenticationProvider',
          values: expect.any(Object),
        },
        {
          name: 'SecondaryFactor',
          values: expect.any(Object),
        },
      ]),
    )
  })

  it('should overwrite class permissions', () => {
    const schema = new Schema({
      schema: {
        classes: [
          {
            name: 'User',
            fields: {},
            permissions: {
              read: {
                requireAuthentication: false,
              },
              update: {
                requireAuthentication: false,
              },
            },
          },
        ],
      },
    } as any)

    const userClass = schema.schema?.classes?.find(
      (schemaClass) => schemaClass.name === 'User',
    )

    expect(userClass?.permissions).toEqual({
      // Default permissions
      create: {
        requireAuthentication: false,
      },
      delete: {
        authorizedRoles: [],
        requireAuthentication: true,
      },
      // Overwrite permissions
      read: {
        requireAuthentication: false,
      },
      update: {
        requireAuthentication: false,
      },
    })
  })

  it('should merge default class with permissions', () => {
    const schema = new Schema<DevWabeTypes>({
      schema: {
        classes: [
          {
            name: 'Payment',
            fields: {},
            permissions: {
              read: {
                authorizedRoles: ['Admin'],
                requireAuthentication: true,
              },
              update: {
                authorizedRoles: ['Admin'],
                requireAuthentication: true,
              },
              delete: {
                authorizedRoles: ['Admin'],
                requireAuthentication: true,
              },
              create: {
                authorizedRoles: ['Admin'],
                requireAuthentication: true,
              },
            },
          },
        ],
      },
    } as any)

    const paymenClass = schema.schema?.classes?.find(
      (schemaClass) => schemaClass.name === 'Payment',
    )

    expect(paymenClass).toEqual({
      name: 'Payment',
      fields: expect.objectContaining({
        amount: {
          type: 'Int',
          required: true,
          description: 'Amount in cents',
        },
      }),
      permissions: {
        read: {
          authorizedRoles: [RoleEnum.Admin],
          requireAuthentication: true,
        },
        update: {
          authorizedRoles: [RoleEnum.Admin],
          requireAuthentication: true,
        },
        delete: {
          authorizedRoles: [RoleEnum.Admin],
          requireAuthentication: true,
        },
        create: {
          authorizedRoles: [RoleEnum.Admin],
          requireAuthentication: true,
        },
      },
    })
  })
})
