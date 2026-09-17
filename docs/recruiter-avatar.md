# Recruiter profile image

Generated with the built-in image generation tool using Ali's existing Seattle portrait as the identity reference. The source photograph and cinematic assets are unchanged.

- Source artwork: `src/assets/Profile/ali-younes-avatar.png`
- Header avatar: `public/recruiter/avatar.webp`, 256 × 256
- Favicon: `public/recruiter/favicon.png`, 64 × 64
- Apple touch icon: `public/recruiter/apple-touch-icon.png`, 180 × 180

The deployment assets are resized encodings of the source artwork. The recruiter document hook installs the icons while a recruiter route is mounted and restores the original icons on exit.

## Generation prompt

Use case: identity-preserve. Asset type: square profile avatar for Ali Younes's software-engineering portfolio, also used as its small browser favicon. Image 1 is the identity reference, the existing portfolio portrait. Create a polished, restrained editorial illustration of this SAME person, accurately preserving his recognizable facial proportions, dark eyebrows, brown eyes, olive complexion, youthful appearance, and thick dark curly hair. Keep the simple black hoodie and black over-ear headphones from the reference. Head and upper shoulders, face centered and filling most of the square so it remains recognizable at 40px; all hair and chin inside a circular safe crop. Calm neutral expression, direct gaze. Clean painterly shapes, subtle natural shading, crisp silhouette, more realistic editorial portrait than cartoon. Plain muted sage background, with natural warm skin colors and charcoal clothing, matching a forest-green and ivory portfolio. No surrounding scene, no cars, no bag straps, no logos, no lettering, no initials, no border, no watermark, no neon, no 3D toy style. Produce one finished square avatar only.

