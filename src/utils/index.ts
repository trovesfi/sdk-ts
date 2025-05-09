export * from '@/utils/logger';

// Utility type to make all optional properties required
export type RequiredFields<T> = {
    [K in keyof T]-?: T[K]
}

// Utility type to get only the required fields of a type
export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}