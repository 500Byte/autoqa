import { cn } from "@/lib/utils"

/**
 * Props for the Skeleton component.
 */
type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton loader component used for showing loading states.
 *
 * @param props - Component props.
 * @returns React component.
 */
function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-gray-200", className)}
            {...props}
        />
    )
}

export { Skeleton }
