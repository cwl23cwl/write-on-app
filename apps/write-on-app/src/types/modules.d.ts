declare module 'lodash.throttle' {
  export default function throttle<TArgs extends unknown[], R>(
    fn: (...args: TArgs) => R,
    wait?: number,
    options?: unknown,
  ): (...args: TArgs) => R;
}
