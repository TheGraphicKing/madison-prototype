# Components: sources, licences and changes

Every third-party component was installed from its library's own free registry (21st.dev was used only to browse). Every icon was removed; every colour is a palette token.

| Component | Source and install | Licence | What changed |
|---|---|---|---|
| Popover, Tooltip | shadcn/ui (base-nova style, Base UI primitives): `npx shadcn@latest add popover tooltip` | MIT | Restyled to tokens: 4 px / 2 px radii, hairline border, one overlay shadow; tooltip arrow removed; tw-animate classes replaced with Base UI `data-starting-style` transitions; `cn` import fixed to `@/lib/utils` |
| Dialog | shadcn/ui `add dialog` | MIT | Rewritten on the same Base UI `Dialog` primitive as `core/overlays.tsx` (SlideOver and Dialog). Removed `lucide-react` `XIcon` (close is a drawn `Mark`), removed `backdrop-blur` on the overlay (flat scrim instead) |
| `lucide-react` | added by `shadcn init` | ISC | **Uninstalled.** `iconLibrary` is unused |
| NumberTicker | Magic UI `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"` | MIT | Colour classes removed (inherits ink); initial value formatted with thousands separators |
| AnimatedList | Magic UI `.../r/animated-list.json` | MIT | Scale-pop spring replaced with a height-open, 320 ms entering ease; left-aligned full-width rows |
| TypingAnimation | Magic UI `.../r/typing-animation.json` | MIT | Installed, then **replaced** by `core/typed.tsx`: same caret idea, but the characters shown are a pure function of `elapsed`, so the run player can seek and replay exactly. Original file removed |
| DotPattern | Magic UI `.../r/dot-pattern.json` | MIT | Removed: its glow mode uses a radial gradient. Canvas grounds use a plain SVG `<pattern>` of 1 px dots instead |
| FileTree | Magic UI `.../r/file-tree.json` | MIT | Removed: it depends on `lucide-react` folder and file icons, Radix accordion and scroll-area. Rebuilt in `components/coverage/file-tree.tsx` with the same Tree / Folder / File structure, drawn chevrons and squares |
| TextScramble | Motion Primitives `npx motion-primitives@latest add text-scramble` | MIT | Character set limited to mono capitals and digits; `motion.create` memoised; skipped under reduced motion; renders a `span` by default |
| BorderTrail | Motion Primitives `add border-trail` | MIT | The masked soft trail (linear-gradient mask) is gone. A single 5 px ink square travels the frame edge on `offset-path: rect()` |
| Tilt | Motion Primitives `add tilt` | MIT | Default rotation clamped to 3 degrees |
| Spotlight | Motion Primitives `add spotlight` | MIT | The blurred radial gradient is replaced with a flat, hard-edged `--surface2` disc |
| TransitionPanel | Motion Primitives `add transition-panel` | MIT | Unchanged code; used with a 240 ms opacity and 4 px rise between change room steps |
| TextRoll | Motion Primitives `add text-roll` | MIT | Unchanged code; used for rolling live metrics |
| DataTable | TanStack Table v9 (`@tanstack/react-table`) | MIT | Headless; markup, hairlines, sort chevrons, keyboard row navigation are ours (`core/data-table.tsx`) |
| Diagrams | `@xyflow/react` (React Flow) | MIT | Duty room lineage graph: custom bracketed nodes, square ports, hairline edges with square packets |
| 3D | `@react-three/fiber`, `@react-three/drei`, `three` | MIT | Matte materials, orthographic camera, contact shadows; labels via drei `Html` |

Fonts: Satoshi (Fontshare Free Font Licence, `src/fonts/Satoshi-LICENSE.txt`), JetBrains Mono (SIL OFL, via `next/font/google`).
