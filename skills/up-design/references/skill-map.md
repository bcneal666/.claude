# emilkowalski skills map

Source: https://aiforui.dev/skills (GitHub: emilkowalski/skills)

Names below are inferred from aiforui.dev URL slugs. Installed names may differ (e.g. with a prefix); the skills listed in the session win. On a mismatch, match by the "Purpose" column.

## Used by up-design

| Phase                       | skill                                | Purpose                                                                         | Skip when                                |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------- |
| Prepare                     | `emil-design-eng`                    | Main skill: author's design-engineering thinking, judgment baseline for the run | Never                                    |
| Prepare                     | `frontend-design:frontend-design`    | Reference for static design (type, color, hierarchy); read only, never build    | Not installed                            |
| Prepare / diagnose / verify | `agent-browser`                      | Screen verification: multi-width screenshots, 320px reflow, overlay shots       | Dev server won't start → code only       |
| Fix                         | `modern-web-guidance`                | Lookup tool: query guidance before implementing platform-feature fixes          | Pure backend, tooling config, copy edits |
| Diagnose                    | shadscan (external CLI, not a skill) | `npx -y @shadscan/cli --json`, read-only audit of shadcn projects               | No `components.json` or no `react`       |
| Diagnose                    | `break-ui`                           | Test UI with extreme data: very long names, odd emails, long lists              | No data-rendering components in scope    |
| Diagnose                    | `mobile-native`                      | Details that make a web app feel smoother on phones                             | No `--m` / `m` argument                  |
| Diagnose / fix              | `ask-sonner`                         | Sonner toast config, examples and fixes (shadcn/ui's toast is Sonner)           | `uses_sonner` is false                   |
| Diagnose / verify           | `animation-performance`              | Keep animation at 60 FPS                                                        | Never                                    |
| Diagnose                    | `remove-animations`                  | Find and remove unnecessary animation                                           | No animation in scope                    |
| Diagnose                    | `improve-animations`                 | Audit all motion and propose a plan                                             | No animation in scope                    |
| Diagnose                    | `find-animation-opportunities`       | Judge where motion should be added                                              | Quick mode                               |
| Fix                         | `animate`                            | General element animation                                                       | No related item in the list              |
| Fix                         | `choreograph`                        | Coordinate several elements moving together                                     | Same                                     |
| Fix                         | `gestures`                           | Feel of drag, swipe, bottom sheet                                               | Same                                     |
| Fix                         | `apple-design`                       | Fluid, physical-feel motion                                                     | Physical-feel motion not needed          |
| Verify                      | `review-animations` ※                | Strict review; result is approve or block                                       | No animation added or changed this run   |
| Rules                       | `learn-taste` ※                      | Turn corrections into rules in lint, DESIGN.md or project skill                 | Never                                    |

※ Set `disable-model-invocation: true`; the agent cannot call them with the Skill tool. Find SKILL.md with `scripts/find_skill.mjs`, then read and follow it.

## Not in the flow

| skill                  | Purpose                                | Note                                                                     |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `ask-emil`             | Guide to the right skill               | up-design's flow is fixed; not needed                                    |
| `write-swift`          | Swift / SwiftUI                        | Not listed on the site; irrelevant to web projects                       |
| `animation-vocabulary` | Find the right term for an animation   | Useful only when discussing animation needs with the user                |
| `pick-ui-library`      | Choose a UI library                    | Project-start tech selection                                             |
| `prototype`            | Build several variants before deciding | Design exploration, not optimization                                     |
| `animate-expo`         | Expo animation                         | For Expo / React Native projects; may replace `animate` in the fix phase |
