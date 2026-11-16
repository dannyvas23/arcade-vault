# SPEC 03 — Integración de Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (modifica `app/layout.tsx`, donde ya vive `ScoresProvider`)
> **Fecha:** 2026-11-15
> **Objetivo:** Integrar Supabase en la app Next.js instalando sus librerías, configurando la conexión por variables de entorno y exponiendo el cliente mediante un contexto de React, sin implementar ninguna funcionalidad de la aplicación.

---

## Por qué existe esta spec

Arcade Vault todavía no tiene backend: las puntuaciones viven en `localStorage` (SPEC 01) y no hay sesión de usuario. Antes de construir Auth, puntuaciones reales o rankings compartidos hace falta la base técnica común: dependencias, credenciales, clientes y un punto de acceso desde React.

Esta spec es **solo infraestructura**. Ninguna pantalla cambia, ninguna tabla se crea y ningún dato se lee ni se escribe. Las funcionalidades que usen Supabase irán en specs posteriores y se apoyarán en lo que deje esta.

El proyecto Supabase ya existe (referencia en `.mcp.json`) y está vacío: 0 tablas y 0 migraciones.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Definir las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.template` y con valores reales en `.env` local.
- Cliente de navegador en `lib/supabase/client.ts` y cliente de servidor en `lib/supabase/server.ts`, ambos creados con `@supabase/ssr`.
- Lectura y validación de las variables de entorno en un único módulo, `lib/supabase/env.ts`, con un error claro si faltan.
- Contexto de React en `components/supabase-provider.tsx`: `SupabaseProvider` y el hook `useSupabase()`, que devuelven el cliente de navegador.
- Montar `SupabaseProvider` en `app/layout.tsx`.
- Comprobación manual puntual de que la conexión funciona, sin dejar código de prueba en el repo.

**Fuera de alcance (para otras specs):**

- Cualquier funcionalidad de la aplicación que use Supabase: lecturas o escrituras de datos, puntuaciones reales, rankings, catálogo de juegos.
- Autenticación: pantalla `/auth`, sesión, perfiles, `proxy.ts` para refrescar la sesión, estado de usuario o de carga en el contexto.
- Esquema de base de datos: tablas, políticas RLS, migraciones y carpeta `supabase/`.
- Tipos generados de la base de datos (`Database`): no hay esquema del que generarlos, así que el cliente va sin tipo genérico.
- Estado de conexión en el contexto o ruta `/api/health` permanente.
- Realtime, Storage y Edge Functions.
- Supabase CLI y entorno local con Docker.
- Reemplazar `localStorage`, `ScoresProvider` o cualquier código existente de la app.
- Corregir la errata `SUPABAS_DB_PASSWORD` de `.env.template`; esa variable no la usa la app.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

Esta spec no introduce datos persistentes ni tablas. Solo añade el contrato del contexto y las variables de entorno.

```ts
// components/supabase-provider.tsx  ("use client")
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseContextValue = SupabaseClient; // sin genérico Database: aún no hay esquema

export function SupabaseProvider(props: { children: React.ReactNode }): JSX.Element;
export function useSupabase(): SupabaseContextValue; // lanza si se usa fuera del provider
```

```ts
// lib/supabase/env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string };
// lanza Error si falta alguna de las dos variables

// lib/supabase/client.ts
export function createClient(): SupabaseClient;           // navegador (createBrowserClient)

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // servidor (createServerClient + cookies())
```

Variables de entorno:

| Variable | Dónde | Uso |
| -------- | ----- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` (local), `.env.template` (vacía) | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env` (local), `.env.template` (vacía) | Clave publicable (`sb_publishable_...`) |

Convenciones:

- Las variables se leen con la forma literal `process.env.NEXT_PUBLIC_...` (nunca con acceso dinámico por nombre); si no, Next no las inlinea en el bundle del cliente.
- Solo se usa la clave **publicable**. La `service_role` o `secret` no se añade al proyecto en esta spec.
- `createClient` del navegador devuelve siempre la misma instancia en el cliente (comportamiento de `createBrowserClient`), y el provider la crea una sola vez con `useState(() => createClient())`.
- El cliente de servidor se crea por llamada, nunca como singleton, porque depende de las cookies de cada petición.
- El `try/catch` en `setAll` del cliente de servidor es intencionado: un Server Component no puede escribir cookies, y eso se tolera sin romper el render.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`): `01-app/02-guides/environment-variables.md` para los pasos 2 y 3, y `01-app/03-api-reference/04-functions/cookies.md` junto con `01-app/01-getting-started/08-caching.md` para el paso 4. Antes de escribir los clientes, consultar la guía vigente de Supabase para Next.js con `search_docs` del MCP.

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. Verificación: `npm ls @supabase/supabase-js @supabase/ssr` lista ambas, `package.json` y `package-lock.json` cambian y `npx tsc --noEmit` pasa.
2. **Variables de entorno.** Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sin valor) a `.env.template`, sin tocar la línea existente. Añadir las mismas variables con sus valores reales a `.env`: la URL con `get_project_url` y la clave `sb_publishable_...` con `get_publishable_keys` del MCP de Supabase. Verificación: `git status` muestra `.env.template` modificado y `.env` ausente (está ignorado); reiniciar `next dev` y confirmar que arranca.
3. **Módulo de entorno y cliente de navegador.** Crear `lib/supabase/env.ts` y `lib/supabase/client.ts`. Verificación: `npx tsc --noEmit` y `npm run lint` pasan. Comprobación manual de conexión: con un componente o script temporal, `createClient().from("tabla_inexistente").select()` devuelve un error `PGRST205` (la API se alcanzó y aceptó la clave), y con una clave alterada devuelve 401. Eliminar el código temporal antes de commitear.
4. **Cliente de servidor.** Crear `lib/supabase/server.ts` con `createServerClient` y el almacén de `cookies()` (asíncrono en esta versión de Next). Verificación: `npx tsc --noEmit` pasa. Comprobación manual con una ruta temporal que llame a `await createClient()` dentro de `<Suspense>` y repita la consulta del paso 3; eliminarla antes de commitear.
5. **Contexto y montaje.** Crear `components/supabase-provider.tsx` y envolver el contenido de `app/layout.tsx` con `<SupabaseProvider>`, por fuera de `<ScoresProvider>`. Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan; `/`, `/juegos`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon` responden 200 con el mismo aspecto que antes y la consola sin errores.

## Criterios de aceptación

**Proyecto y build**

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `dependencies` de `package.json` y en `package-lock.json`.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `/`, `/juegos`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon` responden 200 y no cambian de aspecto.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/` ni en `/salon`.
- [ ] El ciclo jugar → guardar → ver en el Salón (basado en `localStorage`) sigue funcionando igual.

**Variables de entorno y secretos**

- [ ] `.env.template` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores, y conserva la línea previa sin modificar.
- [ ] `git ls-files` incluye `.env.template` y no incluye `.env`.
- [ ] La clave configurada empieza por `sb_publishable_`.
- [ ] `grep -rn "service_role\|SERVICE_ROLE" app components lib` no devuelve resultados.
- [ ] Con una de las dos variables ausente, `getSupabaseEnv()` lanza un `Error` cuyo mensaje nombra la variable que falta.

**Clientes y contexto**

- [ ] `lib/supabase/client.ts` exporta `createClient()` y `lib/supabase/server.ts` exporta `createClient()` asíncrono; ninguno contiene la URL ni la clave escritas a mano.
- [ ] `lib/supabase/env.ts` es el único módulo que lee `process.env.NEXT_PUBLIC_SUPABASE_*`.
- [ ] `app/layout.tsx` monta `SupabaseProvider` envolviendo a `ScoresProvider`.
- [ ] Un componente de cliente que llama a `useSupabase()` recibe un cliente con `from` y `auth` definidos.
- [ ] Dos componentes que llaman a `useSupabase()` reciben la misma referencia de cliente.
- [ ] Llamar a `useSupabase()` fuera de `SupabaseProvider` lanza un `Error` con mensaje en español, como `useScores`.

**Conexión (comprobación manual puntual)**

- [ ] Una consulta a una tabla inexistente con el cliente de navegador devuelve `PGRST205`, no un error de red ni 401.
- [ ] La misma consulta con el cliente de servidor devuelve `PGRST205`.
- [ ] Tras las comprobaciones no queda en el repo ningún archivo, ruta ni componente de prueba (`git status` solo muestra los archivos listados en el plan).

## Decisiones tomadas y descartadas

- **Sí:** alcance limitado a la integración del servicio (librerías, conexión y contexto), por indicación del usuario. **No:** esquema, Auth ni puntuaciones reales; cada uno irá en su propia spec.
- **Sí:** `@supabase/supabase-js` + `@supabase/ssr`, la combinación oficial para App Router. Deja listos un cliente de navegador y otro de servidor basado en cookies para cuando llegue Auth. **No:** solo `supabase-js`, que obligaría a rehacer la integración para Server Components y sesión.
- **Sí:** cliente de servidor incluido aunque aún nada lo use. Evita reabrir la integración en la siguiente spec. **No:** `proxy.ts`: solo sirve para refrescar la sesión y sin Auth no tiene función.
- **Sí:** el contexto expone únicamente el cliente de navegador. **No:** sesión, usuario ni estado de carga (pertenecen a la spec de Auth), ni estado de conexión.
- **Sí:** `SupabaseProvider` por fuera de `ScoresProvider`, para que la futura versión de puntuaciones con Supabase pueda consumir `useSupabase()`. Sigue el patrón de `ScoresProvider` y `useScores` de la SPEC 01.
- **Sí:** nombres `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, el esquema vigente de Supabase, con clave `sb_publishable_...`. **No:** la clave `anon` heredada (JWT), que Supabase mantiene solo por compatibilidad.
- **Sí:** un módulo `lib/supabase/env.ts` que valida las variables y falla con un mensaje claro. **No:** el operador `!` sobre `process.env`, que convierte un error de configuración en un fallo críptico más adelante.
- **Sí:** verificación manual puntual con una consulta a una tabla inexistente (`PGRST205`), que no necesita esquema. **No:** ruta `/api/health` permanente ni código de prueba en el repo, porque sería código nuevo fuera de la integración.
- **Sí:** cliente sin tipo genérico `Database`. **No:** generar tipos, porque la base está vacía; se hará con la primera migración.
- **Sí:** `.env` local con los valores reales y `.env.template` con los nombres. Sigue el `.gitignore` actual (`.env*` ignorado, `.env.template` permitido). **No:** commitear valores.
- **Sí:** dejar la errata `SUPABAS_DB_PASSWORD` como está. Corregirla no forma parte de la integración y la app no usa esa variable.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `cacheComponents` impide prerenderizar una ruta que llama a `cookies()` fuera de `<Suspense>`, lo que afectará a cualquier uso futuro del cliente de servidor | El paso 4 lo prueba con `<Suspense>` y documenta el requisito. En esta spec ninguna ruta real llama al cliente de servidor. |
| Las variables `NEXT_PUBLIC_*` se inlinean en el build; cambiar `.env` sin reiniciar `next dev` o sin rehacer el build deja valores antiguos | Reiniciar `next dev` tras editar `.env` (paso 2) y recordar que en despliegue hay que definirlas antes del build. |
| `SupabaseProvider` es un componente de cliente que también se renderiza en el servidor durante el prerender; si faltan las variables, el build falla | Es deseable: `getSupabaseEnv()` lanza un error con el nombre de la variable. El criterio de aceptación lo exige. |
| Exponer por error una clave secreta en el bundle del cliente | Solo se configura la clave publicable y un criterio comprueba con `grep` que no hay `service_role`. |
| Un acceso dinámico como `process.env[name]` rompe el inlineado en el cliente | Convención explícita: acceso literal en `lib/supabase/env.ts`. |
| La API de `@supabase/ssr` o de Next 16 difiere de lo conocido (`cookies()` es asíncrono, `getAll`/`setAll`) | Consultar la guía vigente de Supabase con `search_docs` y la de `cookies` de Next antes de escribir los clientes. |

## Lo que **no** entra en esta spec

- Ninguna funcionalidad de la app que lea o escriba en Supabase.
- Autenticación, sesión, perfiles ni `proxy.ts`.
- Tablas, políticas RLS, migraciones ni tipos generados.
- Ruta de salud, estado de conexión en el contexto o cualquier código de prueba permanente.
- Realtime, Storage, Edge Functions ni Supabase CLI local.
- Cambios en las pantallas, en `localStorage` o en `ScoresProvider`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
