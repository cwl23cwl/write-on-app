import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
    variable: "--font-display",
    subsets: ["latin"],
    weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
    title: "BrightWrite | Friendly Writing Practice",
    description: "A warm writing corner for young learners to build sentences with ease.",
    openGraph: {
        title: "BrightWrite | Friendly Writing Practice",
        description: "A warm writing corner for young learners to build sentences with ease.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "BrightWrite | Friendly Writing Practice",
        description: "A warm writing corner for young learners to build sentences with ease.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="bg-sunrise">
            <body className={`${nunito.variable} antialiased text-ink bg-transparent`}>{children}</body>
        </html>
    );
}
