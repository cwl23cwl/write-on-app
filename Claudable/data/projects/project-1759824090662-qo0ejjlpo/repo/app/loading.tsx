export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-sunrise px-6">
            <div className="surface-card w-full max-w-3xl animate-pulse rounded-3xl px-8 py-10">
                <div className="mb-6 h-4 w-32 rounded-full bg-white/60" />
                <div className="mb-4 h-8 w-2/3 rounded-full bg-white/70" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="h-32 rounded-3xl bg-white/60" />
                    <div className="h-32 rounded-3xl bg-white/60" />
                </div>
                <div className="mt-6 h-40 rounded-3xl bg-white/70" />
            </div>
        </div>
    );
}
