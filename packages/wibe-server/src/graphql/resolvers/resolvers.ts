import { GraphQLResolveInfo } from 'graphql'
import { WibeApp } from '../..'

const getFieldsFromInfo = (info: GraphQLResolveInfo) => {
    const firstNode = info.fieldNodes[0]

    const edgesNode = firstNode.selectionSet?.selections.find(
        // @ts-expect-error
        (selection) => selection.name.value === 'edges',
    )

    if (edgesNode) {
        // @ts-expect-error
        return firstNode.selectionSet?.selections[0].selectionSet?.selections[0].selectionSet.selections.map(
            // @ts-expect-error
            (selection) => selection.name.value,
        )
    }

    return firstNode.selectionSet?.selections.map(
        // @ts-expect-error
        (selection) => selection.name.value,
    )
}

export const queryForOneObject = (
    _: any,
    { id }: any,
    __: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    return WibeApp.databaseController.getObject<any>({
        className,
        id,
        fields,
    })
}

export const queryForMultipleObject = async (
    _: any,
    { where, offset, limit }: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    const objects = await WibeApp.databaseController.getObjects<any>({
        className,
        where,
        fields,
        offset,
        limit,
    })

    return {
        edges: objects.map((object: any) => ({
            node: object,
        })),
    }
}

export const mutationToCreateObject = (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    return WibeApp.databaseController.createObject<any>({
        className,
        data: args.input?.fields,
        fields,
    })
}

export const mutationToCreateMultipleObjects = async (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    const objects = await WibeApp.databaseController.createObjects<any>({
        className,
        data: args.input?.fields,
        fields,
        offset: args.input?.offset,
        limit: args.input?.limit,
    })

    return {
        edges: objects.map((object: any) => ({ node: object })),
    }
}

export const mutationToUpdateObject = (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    return WibeApp.databaseController.updateObject<any>({
        className,
        id: args.input?.id,
        data: args.input?.fields,
        fields,
    })
}

export const mutationToUpdateMultipleObjects = async (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    const objects = await WibeApp.databaseController.updateObjects<any>({
        className,
        where: args.input?.where,
        data: args.input?.fields,
        fields,
        offset: args.input?.offset,
        limit: args.input?.limit,
    })

    return {
        edges: objects.map((object: any) => ({ node: object })),
    }
}

export const mutationToDeleteObject = async (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    return WibeApp.databaseController.deleteObject<any>({
        className,
        id: args.input?.id,
        fields,
    })
}

export const mutationToDeleteMultipleObjects = async (
    _: any,
    args: any,
    ___: any,
    info: GraphQLResolveInfo,
    className: string,
) => {
    const fields = getFieldsFromInfo(info)

    if (!fields) throw new Error('No fields provided')

    const objects = await WibeApp.databaseController.deleteObjects<any>({
        className,
        where: args.input?.where,
        fields,
        offset: args.input?.offset,
        limit: args.input?.limit,
    })

    return {
        edges: objects.map((object: any) => ({ node: object })),
    }
}
