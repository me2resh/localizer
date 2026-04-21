---
id: AgDR-0001
timestamp: 2026-04-21T21:20:00Z
agent: atlas
model: claude-opus-4-7
trigger: user-prompt
status: executed
ticket: me2resh/localizer (handover)
---

# Vitest as the unified test runner for Localizer

> In the context of establishing the first test baseline on Localizer after its ApexYard handover, facing the choice between Vitest unified, Jest unified, or splitting `node:test` on the server with Vitest on the client, I decided to use **Vitest across both `web/server/` and `web/client/`** (with React Testing Library on the client) to achieve a single runner, native ESM support, and alignment with the Vite build tool already in use, accepting that Vitest's plugin ecosystem is younger than Jest's.

## Context

Localizer ships as a bash CLI plus a web app. The web app has two JS codebases:

- `web/server/` — Express 4 + Multer + cors, declared `"type": "module"` (ESM).
- `web/client/` — React 18 + Vite 6 + Tailwind 3.

Neither currently has any test files, any test runner configured, or any lint / CI. The handover assessment (`me2resh/ops:projects/localizer/handover-assessment.md`) names "zero tests" as the top technical-debt risk and "pick a test framework" as step 2 of the integration plan. This AgDR picks the framework so that follow-up PRs can land a smoke-test baseline and copy in `golden-paths/pipelines/ci.yml`.

Constraint: the server is ESM (`"type": "module"`). Whatever runner we pick must handle that cleanly without a Babel transform stack or experimental flags.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Vitest unified** (server + client; React Testing Library on the client) | Single runner across both subtrees, one config shape, one CI job. Native ESM — no Babel, no `--experimental-vm-modules`. Vite is already the client build tool so Vitest is the zero-friction continuation. Fast (esbuild transform, native parallelism). Rich assertion + mocking API similar enough to Jest that prior Jest-muscle-memory still works. | Younger ecosystem than Jest. Rare edge-case plugins may not exist. Vitest-specific docs for React Testing Library are newer though fully sufficient. |
| **Jest unified** (ts-jest or babel-jest for both) | Largest ecosystem. Battle-tested on Express + React for a decade. Most Stack Overflow coverage. | ESM support is still experimental and flaky with `"type": "module"` — requires Babel or `--experimental-vm-modules`. Slower than Vitest. Doesn't share config with Vite, so the client's build and test toolchains diverge. |
| **Node `node:test` (server) + Vitest (client)** | Zero test-runner deps on the server (`node --test` is built-in). Vitest on the client where it already belongs. | Two runners, two configs, two CI jobs. `node:test` has thin matchers + no mock system — needs `node:assert` + a separate mocking lib. Split isn't worth the savings at this repo size. |

### Decision dimensions weighted

| Dimension | Weight | Vitest | Jest | node:test + Vitest |
|-----------|--------|--------|------|--------------------|
| **ESM-native** (server is `"type": "module"`) | Critical | ✅ | ❌ (experimental) | ✅ |
| **Aligned with existing stack** (Vite 6 is already in use) | High | ✅ | ❌ | ✅ (client only) |
| **Single tool for both subtrees** | High | ✅ | ✅ | ❌ |
| **Rich matcher + mocking API out of the box** | Medium | ✅ | ✅ | ❌ |
| **Speed** (fast feedback on a personal-project repo) | Medium | ✅ | ~ | ✅ |
| **Ecosystem maturity** | Low (repo size) | ~ | ✅ | ~ |

Vitest dominates on the two critical dimensions and wins everywhere else except raw ecosystem maturity — which doesn't matter at this repo size. Jest's ESM fragility is a real blocker given the server is already `"type": "module"`.

## Decision

Chosen: **Vitest unified**, because (a) it's the only option that handles the existing ESM server without tooling gymnastics, (b) it's the natural continuation of the Vite-based client toolchain, and (c) one runner keeps the config, CI, and contributor onboarding simple.

Concrete shape for the follow-up implementation PR:

- `web/server/`: add `vitest` as a devDependency; add a `test` script (`vitest run`) and `test:watch` (`vitest`); create `web/server/index.test.js` as the first smoke test covering the healthcheck / upload-accept path.
- `web/client/`: add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies; add Vitest config that reuses the existing `vite.config.js` (`vitest.config.js` importing from it) with `environment: 'jsdom'`; add the `setupFiles` for `@testing-library/jest-dom` matchers; create one smoke test for the root App.
- `web/package.json` workspace runner: extend the `concurrently` setup to run both suites in one `npm test` at the web root.
- Add `.github/workflows/ci.yml` copied from `golden-paths/pipelines/ci.yml`, adapted to run `npm test` in `web/`.

## Consequences

Positive:

- ESM server gets tested without any transform stack. Fast feedback loop.
- Client tests live alongside the Vite config they already use; one tool, one mental model.
- CI can be a single `npm test` at the `web/` root, parallelised via `concurrently`.
- Future refactors can reach for Vitest-specific features (in-source testing, `vi.mock`) confident the whole tree runs them.
- Migration path is clean: if Vitest ever stops fitting, Jest is an `npm install` + config swap away for the parts that haven't leaned into Vitest-specific APIs.

Negative (accepted):

- Vitest's ecosystem is smaller than Jest's. For an edge-case plugin we might hit a gap — accepted because the repo's test needs are mainstream (HTTP-handler assertions, React component rendering, DOM matchers) and all of those are well-supported.
- Contributors who have deep Jest muscle-memory will trip on minor API differences (`vi.fn()` vs `jest.fn()`). Accepted because the API is 80% identical and the onboarding doc can point at the differences.

## Artifacts

- Handover assessment: `me2resh/ops:projects/localizer/handover-assessment.md` (step 2 of Next Steps).
- Follow-up implementation PR: TBD — will be filed after this AgDR lands as the first feature PR on localizer.
- Upstream Vitest docs: https://vitest.dev
