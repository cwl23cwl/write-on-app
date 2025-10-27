"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { BookOpenCheck, Lightbulb, ListChecks, Sparkles } from "lucide-react";
import { z } from "zod";

const writingSectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    helper: z.string(),
    placeholder: z.string(),
    reminder: z.string(),
});
type WritingSection = z.infer<typeof writingSectionSchema>;

const focusPointSchema = z.object({
    label: z.string(),
    description: z.string(),
});
type FocusPoint = z.infer<typeof focusPointSchema>;

const checklistItemSchema = z.object({
    id: z.string(),
    label: z.string(),
});
type ChecklistItem = z.infer<typeof checklistItemSchema>;

const transitionGroupSchema = z.object({
    title: z.string(),
    phrases: z.array(z.string()),
});
type TransitionGroup = z.infer<typeof transitionGroupSchema>;

const writingSections = writingSectionSchema.array().parse([
    {
        id: "introduction",
        title: "Introduction paragraph",
        helper: "Hook your reader and end with a clear thesis statement.",
        placeholder: "Set the scene, introduce your topic, and share your thesis...",
        reminder: "Use a hook, give context, and finish with the main idea of your essay.",
    },
    {
        id: "bodyOne",
        title: "Body paragraph 1",
        helper: "Share your first big reason or example that supports the thesis.",
        placeholder: "State your first main idea and add supporting evidence or details...",
        reminder: "Begin with a topic sentence and explain why this idea matters.",
    },
    {
        id: "bodyTwo",
        title: "Body paragraph 2",
        helper: "Build on your story with the next important idea or event.",
        placeholder: "Move into your second point with facts, feelings, or events...",
        reminder: "Connect this point back to the thesis. Include transition phrases.",
    },
    {
        id: "bodyThree",
        title: "Body paragraph 3",
        helper: "Wrap up your supporting ideas with one last strong example.",
        placeholder: "Introduce your final supporting idea and explain the details...",
        reminder: "Show how this final idea prepares the reader for the conclusion.",
    },
    {
        id: "conclusion",
        title: "Conclusion paragraph",
        helper: "Restate the thesis and leave the reader with a closing thought.",
        placeholder: "Remind the reader of your big ideas and end with a final message...",
        reminder: "Summarize the key points and finish with a takeaway or reflection.",
    },
]);

const focusPoints = focusPointSchema.array().parse([
    {
        label: "Warm welcome",
        description: "Open with a sentence that invites readers in-try a question, quote, or a bold fact.",
    },
    {
        label: "Strong structure",
        description: "Each body paragraph needs one clear idea with details that link back to your thesis.",
    },
    {
        label: "Smooth landings",
        description: "Use transitions to glide between ideas and finish with a thoughtful closing line.",
    },
]);

const checklistItems = checklistItemSchema.array().parse([
    { id: "claim", label: "My thesis statement is easy to find in the introduction." },
    { id: "evidence", label: "Each body paragraph includes facts, details, or examples." },
    { id: "voice", label: "I used transition words so every paragraph flows naturally." },
    { id: "wrap", label: "The conclusion restates the thesis and leaves a final thought." },
]);

const transitionGroups = transitionGroupSchema.array().parse([
    {
        title: "To begin",
        phrases: ["To start", "Right away", "Imagine this", "First of all"],
    },
    {
        title: "To connect",
        phrases: ["Another reason", "Meanwhile", "On top of that", "Next"],
    },
    {
        title: "To conclude",
        phrases: ["In the end", "As a result", "Ultimately", "This shows"],
    },
]);

const TARGET_WORD_COUNT = 500;

const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
};

const progressTransition = { duration: 0.5, ease: "easeOut" } as const;

type DraftState = Record<WritingSection["id"], string>;
type WordCounts = Record<WritingSection["id"], number>;

const buildInitialDraftState = (): DraftState =>
    Object.fromEntries(writingSections.map(({ id }) => [id, ""])) as DraftState;

const calculateWordCounts = (draftState: DraftState): WordCounts =>
    Object.fromEntries(
        writingSections.map(({ id }) => [id, countWords(draftState[id])]),
    ) as WordCounts;

const countTotalWords = (counts: WordCounts): number =>
    Object.values(counts).reduce((sum, count) => sum + count, 0);

function countWords(value: string): number {
    if (!value.trim()) {
        return 0;
    }

    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

export default function Home() {
    const [draft, setDraft] = useState<DraftState>(buildInitialDraftState);

    const wordCounts = useMemo(() => calculateWordCounts(draft), [draft]);
    const totalWords = useMemo(() => countTotalWords(wordCounts), [wordCounts]);

    const progressRatio = totalWords / TARGET_WORD_COUNT;
    const clampedProgress = Math.min(Math.max(progressRatio, 0), 1);
    const progressPercent = Math.round(clampedProgress * 100);

    const handleDraftChange = useCallback(
        (sectionId: WritingSection["id"]) => (event: ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.target.value;

            setDraft((previousDraft) => ({
                ...previousDraft,
                [sectionId]: nextValue,
            }));
        },
        [],
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen bg-cream text-ink"
        >
            <motion.header variants={fadeUp} className="border-b border-ink/5 bg-cream/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-cloud text-lg font-semibold shadow-sm">
                            AW
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Student view</span>
                            <h1 className="text-xl font-semibold text-ink">Assignment Workspace</h1>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <WordGoalCard
                            progress={clampedProgress}
                            percent={progressPercent}
                            total={totalWords}
                            target={TARGET_WORD_COUNT}
                        />
                        <ActionButtons />
                    </div>
                </div>
            </motion.header>

            <motion.main variants={fadeUp} className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start">
                <div className="flex w-full flex-col gap-5 lg:max-w-xs">
                    <FocusPointsCard points={focusPoints} />
                    <ChecklistCard items={checklistItems} />
                    <TransitionsCard groups={transitionGroups} />
                </div>

                <div className="flex-1 space-y-6">
                    {writingSections.map((section) => (
                        <WritingSectionCard
                            key={section.id}
                            section={section}
                            draftValue={draft[section.id]}
                            wordCount={wordCounts[section.id]}
                            onChange={handleDraftChange(section.id)}
                        />
                    ))}
                </div>
            </motion.main>
        </motion.div>
    );
}

interface CardFrameProps {
    children: ReactNode;
    className?: string;
}

function CardFrame({ children, className }: CardFrameProps) {
    const composedClassName = ["surface-card p-6", className].filter(Boolean).join(" ");

    return (
        <motion.section variants={fadeUp} className={composedClassName}>
            {children}
        </motion.section>
    );
}

interface CardHeaderProps {
    icon: ReactNode;
    title: string;
    description: string;
}

function CardHeader({ icon, title, description }: CardHeaderProps) {
    return (
        <div className="flex items-center gap-3">
            {icon}
            <div className="flex flex-col">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <p className="text-sm text-ink/60">{description}</p>
            </div>
        </div>
    );
}

interface WordGoalCardProps {
    progress: number;
    percent: number;
    total: number;
    target: number;
}

function WordGoalCard({ progress, percent, total, target }: WordGoalCardProps) {
    const progressWidth = `${(progress * 100).toFixed(1)}%`;

    return (
        <div className="flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-cloud px-4 py-3 text-sm text-ink/70 shadow-sm sm:w-auto">
            <BookOpenCheck className="h-4 w-4 text-teal" />
            <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink/50">
                    <span>Word goal</span>
                    <span>{percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-ink/10">
                    <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: progressWidth }}
                        transition={progressTransition}
                    />
                </div>
                <span className="text-xs text-ink/55">
                    {total}/{target} words
                </span>
            </div>
        </div>
    );
}

function ActionButtons() {
    return (
        <div className="flex items-center gap-2">
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-cloud px-5 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary hover:text-primary"
            >
                Save draft
            </motion.button>
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-cloud shadow-lg transition-colors hover:bg-primary/90"
            >
                Submit writing
            </motion.button>
        </div>
    );
}

interface FocusPointsCardProps {
    points: FocusPoint[];
}

function FocusPointsCard({ points }: FocusPointsCardProps) {
    return (
        <CardFrame>
            <CardHeader
                icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Sparkles className="h-5 w-5" />
                    </span>
                }
                title="Today's focus"
                description="Keep it clear, warm, and organized."
            />
            <ul className="mt-4 space-y-4">
                {points.map(({ label, description }) => (
                    <li key={label} className="flex gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-ink">{label}</p>
                            <p className="text-sm text-ink/65">{description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </CardFrame>
    );
}

interface ChecklistCardProps {
    items: ChecklistItem[];
}

function ChecklistCard({ items }: ChecklistCardProps) {
    return (
        <CardFrame>
            <CardHeader
                icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/15 text-teal">
                        <ListChecks className="h-5 w-5" />
                    </span>
                }
                title="Quick checklist"
                description="Review before you submit."
            />
            <ul className="mt-4 space-y-3">
                {items.map(({ id, label }) => (
                    <li key={id} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-teal/40 bg-teal/10 text-[11px] font-semibold text-teal">
                            ?
                        </span>
                        <p className="text-sm text-ink/70">{label}</p>
                    </li>
                ))}
            </ul>
        </CardFrame>
    );
}

interface TransitionsCardProps {
    groups: TransitionGroup[];
}

function TransitionsCard({ groups }: TransitionsCardProps) {
    return (
        <CardFrame>
            <CardHeader
                icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20 text-ink">
                        <Lightbulb className="h-5 w-5" />
                    </span>
                }
                title="Transitions & word bank"
                description="Try these phrases to connect ideas."
            />
            <div className="mt-4 space-y-4">
                {groups.map(({ title, phrases }) => (
                    <div key={title} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">{title}</p>
                        <div className="flex flex-wrap gap-2">
                            {phrases.map((phrase) => (
                                <span
                                    key={phrase}
                                    className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal"
                                >
                                    {phrase}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </CardFrame>
    );
}

interface WritingSectionCardProps {
    section: WritingSection;
    draftValue: string;
    wordCount: number;
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

function WritingSectionCard({ section, draftValue, wordCount, onChange }: WritingSectionCardProps) {
    return (
        <CardFrame className="sm:p-7">
            <div className="flex flex-col gap-4 border-b border-ink/5 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl space-y-2">
                    <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                    <p className="text-sm text-ink/65">{section.helper}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-gold/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink/80">
                        Required
                    </span>
                    <span className="text-xs font-semibold text-ink/50">{wordCount} words</span>
                </div>
            </div>
            <label className="sr-only" htmlFor={section.id}>
                {section.title}
            </label>
            <textarea
                id={section.id}
                value={draftValue}
                onChange={onChange}
                placeholder={section.placeholder}
                className="mt-5 w-full resize-y rounded-2xl border border-ink/10 bg-cloud px-4 py-4 text-base leading-relaxed text-ink shadow-inner transition-all duration-200 ease-out focus:border-primary focus:ring-4 focus:ring-primary/15 sm:min-h-[160px]"
            />
            <p className="mt-3 text-xs text-ink/55">{section.reminder}</p>
        </CardFrame>
    );
}
