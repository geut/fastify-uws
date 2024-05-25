export class HTTPSocket {
    constructor(server: any, res: any, writeOnly: any);
    aborted: boolean;
    writableNeedDrain: boolean;
    bytesRead: number;
    bytesWritten: number;
    writableEnded: boolean;
    errored: any;
    get readyState(): "open" | "opening" | "readOnly" | "writeOnly";
    get writable(): boolean;
    get readable(): boolean;
    get encrypted(): boolean;
    get remoteAddress(): any;
    get remoteFamily(): "IPv4" | "IPv6";
    get destroyed(): boolean;
    address(): any;
    abort(): void;
    setEncoding(encoding: any): void;
    destroy(err: any): void;
    onRead(cb: any): any;
    end(data: any, _: any, cb?: () => void): void;
    write(data: any, _: any, cb?: () => void): boolean;
    _clearTimeout(): void;
    _onWrite(data: any, cb: any): void;
}
