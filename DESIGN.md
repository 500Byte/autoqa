---
name: AutoQA
description: Precision auditing tool for technical QA Engineers.
colors:
  primary: "#2563EB"
  background: "#ffffff"
  foreground: "#09090b"
  card: "#ffffff"
  muted: "#f4f4f5"
  border: "#e4e4e7"
  destructive: "#ef4444"
typography:
  sans:
    fontFamily: "var(--font-inter), sans-serif"
  display:
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontSize: "1rem"
    lineHeight: 1.5
rounded:
  lg: "12px"
  md: "10px"
  sm: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-base:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: AutoQA

## 1. Overview

**Creative North Star: "Clinical Precision"**

AutoQA is designed for technical users who demand accuracy and efficiency. The interface avoids the "SaaS fluff" of generic dashboard templates, opting instead for a high-density, high-contrast environment that prioritizes analytical clarity. It feels like a high-end laboratory instrument: sterile but powerful, organized but deep.

The system explicitly rejects decorative glassmorphism and cluttered enterprise patterns. Every pixel serves a purpose in the auditing workflow.

**Key Characteristics:**
- **High-Density Data**: Tight baseline grid (4px) to maximize information without crowding.
- **Vibrant Functional Accents**: Use of Electric Blue (`{colors.primary}`) only for interactive or active states.
- **Crisp Structural Borders**: Clear separation of concerns via `{colors.border}` instead of heavy shadows.

## 2. Colors

The color strategy is **Restrained**, using a monochromatic base with a single electric blue accent.

### Primary
- **Electric Blue** (#2563EB): The primary signal for interaction and "active" status. Used for buttons, focus rings, and progress indicators.

### Neutral
- **Deep Charcoal** (#09090b): Primary text and high-contrast foreground.
- **Tinted White** (#ffffff): Clean background for maximum readability.
- **Soft Grey** (#e4e4e7): Structural borders and subtle dividers.
- **Muted Zinc** (#f4f4f5): Secondary backgrounds for cards and inputs.

### Named Rules
**The Rarity Rule.** The primary accent blue is used on ≤10% of any given screen. Its rarity makes it an immediate beacon for the user's eye.

## 3. Typography

**Primary Font:** Inter (Sans-serif)
**Character:** Clean, neutral, and highly legible at small sizes for technical logs.

### Hierarchy
- **Display** (700, 3rem, 1.2): Reserved for high-level summaries and hero headers.
- **Body** (400, 1rem, 1.5): Standard for all descriptive text. Capped at 70ch.
- **Label** (500, 0.875rem, 1.25): Used for badges, labels, and analytical keys.

## 4. Elevation

AutoQA uses **Tonal Layering** and crisp borders rather than physical shadows to denote depth.

### Named Rules
**The Border-First Rule.** Depth is created by nested borders and background shifts (Zinc on White). Shadows are reserved for floating elements like popovers or active modals.

## 5. Components

### Buttons
- **Shape:** Medium radius (10px).
- **Primary:** Electric Blue fill with white text. High-contrast and immediately actionable.
- **Hover:** Slight brightness increase to signal interactivity.

### Cards
- **Style:** White background with a 1px border (#e4e4e7).
- **Radius:** Large (12px).
- **Padding:** Standard 24px internal spacing.

## 6. Do's and Don'ts

### Do:
- **Do** use 1px borders for structural separation.
- **Do** maintain high contrast between text and background (WCAG 2.1 AA compliant).
- **Do** cap line lengths at 70ch for readability.

### Don't:
- **Don't** use "side-stripe" borders as colored accents on cards.
- **Don't** use decorative glassmorphism or background blurs.
- **Don't** use purely decorative icons; every icon must map to a clear audit action.
- **Don't** use inconsistent spacing; strictly adhere to the 4px baseline.
