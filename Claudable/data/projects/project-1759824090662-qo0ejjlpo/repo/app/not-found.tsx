import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-sunrise px-6">
            <div className="surface-card flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
                <h2 className="text-2xl font-bold text-ink">Page not here yet</h2>
                <p className="text-sm text-ink/70">Let&apos;s head back to the writing room.</p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white shadow-md"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
