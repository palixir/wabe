/// <reference types="node" />
import { Readable } from 'stream';
export declare function getHeadersObj(headers: Headers): Record<string, string>;
export declare function defaultHeadersSerializer(headers: Headers, onContentLength?: (value: string) => void): string[];
export declare function fakePromise<T>(value: T): Promise<T>;
export declare function isArrayBufferView(obj: any): obj is ArrayBufferView;
export declare function isNodeReadable(obj: any): obj is Readable;
