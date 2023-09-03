import { isSome } from './helpers.js';
export function mergeDeep(sources, respectPrototype = false, respectArrays = false) {
    const target = sources[0] || {};
    const output = {};
    if (respectPrototype) {
        Object.setPrototypeOf(output, Object.create(Object.getPrototypeOf(target)));
    }
    for (const source of sources) {
        if (isObject(target) && isObject(source)) {
            if (respectPrototype) {
                const outputPrototype = Object.getPrototypeOf(output);
                const sourcePrototype = Object.getPrototypeOf(source);
                if (sourcePrototype) {
                    for (const key of Object.getOwnPropertyNames(sourcePrototype)) {
                        const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, key);
                        if (isSome(descriptor)) {
                            Object.defineProperty(outputPrototype, key, descriptor);
                        }
                    }
                }
            }
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!(key in output)) {
                        Object.assign(output, { [key]: source[key] });
                    }
                    else {
                        output[key] = mergeDeep([output[key], source[key]], respectPrototype, respectArrays);
                    }
                }
                else if (respectArrays && Array.isArray(output[key])) {
                    if (Array.isArray(source[key])) {
                        output[key].push(...source[key]);
                    }
                    else {
                        output[key].push(source[key]);
                    }
                }
                else {
                    Object.assign(output, { [key]: source[key] });
                }
            }
        }
        else if (respectArrays && Array.isArray(target)) {
            if (Array.isArray(source)) {
                target.push(...source);
            }
            else {
                target.push(source);
            }
        }
        else if (respectArrays && Array.isArray(source)) {
            return [target, ...source];
        }
    }
    return output;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
