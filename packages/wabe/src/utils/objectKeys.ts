const unsafeObjectKeys = new Set(['__proto__', 'prototype', 'constructor'])

export const isUnsafeObjectKey = (key: string): boolean => unsafeObjectKeys.has(key)
