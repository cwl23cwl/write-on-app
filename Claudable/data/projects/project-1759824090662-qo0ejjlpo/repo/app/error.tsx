"use client";

type ErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-sunrise px-6">
            <div className="surface-card flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-peach text-3xl">
                    :(
                </span>
                <h2 className="text-2xl font-bold text-ink">Oops! Let&apos;s try again.</h2>
                <p className="text-sm text-ink/70">
                    Something went wrong. Tap the button to reset the page and keep writing.
                </p>
                <button
                    onClick={reset}
                    className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white shadow-md"
                >
                    Reset page
                </button>
            </div>
        </div>
    );
}
