/// <reference types="node" />
interface BlobOptions {
    /**
     * @default 'utf8'
     */
    encoding?: BufferEncoding | undefined;
    /**
     * The Blob content-type. The intent is for `type` to convey
     * the MIME media type of the data, however no validation of the type format
     * is performed.
     */
    type?: string | undefined;
    /**
     * The size of the Blob object in bytes.
     */
    size?: number | null;
}
export declare class PonyfillBlob implements Blob {
    private blobParts;
    type: string;
    private encoding;
    private _size;
    constructor(blobParts: BlobPart[], options?: BlobOptions);
    arrayBuffer(): Promise<Buffer>;
    text(): Promise<string>;
    get size(): number;
    stream(): any;
    slice(): any;
}
export interface PonyfillBlob {
    prototype: Blob;
    new (blobParts?: BlobPart[], options?: BlobPropertyBag): Blob;
}
export {};
