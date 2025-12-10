// Type definitions for stremio-addon-sdk
declare module 'stremio-addon-sdk' {
    export interface ManifestCatalog {
        type: string;
        id: string;
        name: string;
        extra?: Array<{
            name: string;
            isRequired?: boolean;
            options?: string[];
        }>;
    }

    export interface ManifestConfig {
        key: string;
        type: string;
        title: string;
        options?: string[];
        optionNames?: Record<string, string>;
        default?: string[];
    }

    export interface Manifest {
        id: string;
        version: string;
        name: string;
        description: string;
        logo?: string;
        background?: string;
        resources: string[];
        types: string[];
        idPrefixes?: string[];
        catalogs: ManifestCatalog[];
        behaviorHints?: {
            configurable?: boolean;
            configurationRequired?: boolean;
        };
        config?: ManifestConfig[];
    }

    export interface MetaPreview {
        id: string;
        type: string;
        name: string;
        poster?: string;
        posterShape?: 'square' | 'poster' | 'landscape';
        background?: string;
        logo?: string;
        description?: string;
        genres?: string[];
        releaseInfo?: string;
        runtime?: string;
        links?: Array<{
            name: string;
            category: string;
            url: string;
        }>;
    }

    export interface Meta extends MetaPreview {
        website?: string;
    }

    export interface Stream {
        url?: string;
        ytId?: string;
        infoHash?: string;
        fileIdx?: number;
        externalUrl?: string;
        title?: string;
        name?: string;
        behaviorHints?: {
            notWebReady?: boolean;
            bingeGroup?: string;
            proxyHeaders?: {
                request?: Record<string, string>;
                response?: Record<string, string>;
            };
        };
    }

    export interface CatalogHandlerArgs {
        type: string;
        id: string;
        extra: {
            search?: string;
            skip?: string;
            genre?: string;
            config?: string;
        };
    }

    export interface MetaHandlerArgs {
        type: string;
        id: string;
    }

    export interface StreamHandlerArgs {
        type: string;
        id: string;
    }

    export class addonBuilder {
        constructor(manifest: Manifest);
        defineCatalogHandler(handler: (args: CatalogHandlerArgs) => Promise<{ metas: MetaPreview[] }>): void;
        defineMetaHandler(handler: (args: MetaHandlerArgs) => Promise<{ meta: Meta | null }>): void;
        defineStreamHandler(handler: (args: StreamHandlerArgs) => Promise<{ streams: Stream[] }>): void;
        getInterface(): any;
    }

    export function serveHTTP(addonInterface: any, options: {
        port?: number;
        getRouter?: (router: any) => any;
    }): Promise<{ url: string }>;

    export function publishToCentral(url: string): void;
}

