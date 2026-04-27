import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes using clsx and tailwind-merge.
 *
 * @param inputs - List of class values to be merged.
 * @returns A string of merged CSS classes.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
