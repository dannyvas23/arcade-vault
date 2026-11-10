# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**Arcade Vault** is a platform for playing games online and competing for the highest score (see `README.md`). The app is currently the untouched `create-next-app` scaffold (`app/page.tsx` is still the starter page, metadata is still "Create Next App"); there is no game, score, or backend code yet.

The project follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from `Klerith/fernando-skills` (installed with `npx skills@latest add Klerith/fernando-skills`). The sibling `../juego_arkanoid/` project shows the intended workflow: numbered spec files in `specs/` (e.g. `03-pelota-y-colisiones.md`), committed first ("Agregar especificación NN: ...") and then implemented in a separate commit ("Implementar spec NN: ..."). Conversation and commit messages are in Spanish.

## Skill

Usa siempre /frontend-desing para diseñar la interfaz de usuario

There is no test framework installed, so there is no single-test command yet.

## Stack and non-obvious configuration

- **Next.js 16.4.6 + React 19.3 + Tailwind CSS 4.3**, App Router in `app/`, TypeScript `strict`, path alias `@/*` → repo root.
- **This is not the Next.js from your training data.** Before writing Next code, read the matching guide in `node_modules/next/dist/docs/` (`01-getting-started`, `02-guides`, `03-api-reference`). `AGENTS.md` is auto-managed by `next dev`; leave its block in place.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. `cacheComponents` changes caching/rendering semantics (dynamic data access and caching are opt-in via the Cache Components APIs), so check the docs for it before adding data fetching.
- Tailwind is wired through a **Turbopack rule** (`@tailwindcss/turbopack` loader on `*.css`) rather than a PostCSS config; there is no `postcss.config`. Theme tokens live in `app/globals.css` (`@theme inline`) and the Geist fonts are loaded in `app/layout.tsx`.
- `app/layout.tsx` uses the globally generated `LayoutProps<"/">` type helper (produced by Next's typegen in `.next/types`), so run `next dev`/`next build` before `tsc` if that type is missing.
- `.gitignore` excludes `.env*` and `next-env.d.ts`.

## Repository layout note

This directory is a subfolder of a larger git repo (`cursostomados`, an educational-materials collection). The `CLAUDE.md` one level up (`../../CLAUDE.md`) describes that wider repo; treat this file as the guide for `arcade-vault/` only.
