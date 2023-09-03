"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExtensionsFromSchema = void 0;
const Interfaces_js_1 = require("./Interfaces.js");
const mapSchema_js_1 = require("./mapSchema.js");
function handleDirectiveExtensions(extensions = {}) {
    const finalExtensions = {
        ...extensions,
    };
    const directives = finalExtensions.directives;
    if (directives != null) {
        for (const directiveName in directives) {
            const directiveObj = directives[directiveName];
            if (!Array.isArray(directiveObj)) {
                directives[directiveName] = [directiveObj];
            }
        }
    }
    return finalExtensions;
}
function extractExtensionsFromSchema(schema) {
    const result = {
        schemaExtensions: handleDirectiveExtensions(schema.extensions),
        types: {},
    };
    (0, mapSchema_js_1.mapSchema)(schema, {
        [Interfaces_js_1.MapperKind.OBJECT_TYPE]: type => {
            result.types[type.name] = {
                fields: {},
                type: 'object',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.INTERFACE_TYPE]: type => {
            result.types[type.name] = {
                fields: {},
                type: 'interface',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.FIELD]: (field, fieldName, typeName) => {
            result.types[typeName].fields[fieldName] = {
                arguments: {},
                extensions: handleDirectiveExtensions(field.extensions),
            };
            const args = field.args;
            if (args != null) {
                for (const argName in args) {
                    result.types[typeName].fields[fieldName].arguments[argName] =
                        handleDirectiveExtensions(args[argName].extensions);
                }
            }
            return field;
        },
        [Interfaces_js_1.MapperKind.ENUM_TYPE]: type => {
            result.types[type.name] = {
                values: {},
                type: 'enum',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.ENUM_VALUE]: (value, typeName, _schema, valueName) => {
            result.types[typeName].values[valueName] = handleDirectiveExtensions(value.extensions);
            return value;
        },
        [Interfaces_js_1.MapperKind.SCALAR_TYPE]: type => {
            result.types[type.name] = {
                type: 'scalar',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.UNION_TYPE]: type => {
            result.types[type.name] = {
                type: 'union',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.INPUT_OBJECT_TYPE]: type => {
            result.types[type.name] = {
                fields: {},
                type: 'input',
                extensions: handleDirectiveExtensions(type.extensions),
            };
            return type;
        },
        [Interfaces_js_1.MapperKind.INPUT_OBJECT_FIELD]: (field, fieldName, typeName) => {
            result.types[typeName].fields[fieldName] = {
                extensions: handleDirectiveExtensions(field.extensions),
            };
            return field;
        },
    });
    return result;
}
exports.extractExtensionsFromSchema = extractExtensionsFromSchema;
