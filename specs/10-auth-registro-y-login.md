# SPEC 10 — Registro, login y autenticación con Supabase Auth

> **Estado:** Implementado
> **Depende de:** SPEC 01 (barra de navegación y estilo neón/CRT), SPEC 03 (clientes de Supabase, `SupabaseProvider`; deja `proxy.ts` y la sesión para esta spec), SPEC 05 (`submitScore` y `scores`, que esta spec no toca)
> **Fecha:** 2026-11-24
> **Objetivo:** Añadir pantallas de registro, login (email y contraseña, Google y GitHub), confirmación de correo y recuperación de contraseña con Supabase Auth, mostrando la sesión en la barra de navegación y sin vincular todavía las puntuaciones al usuario.
> **Enmienda (2026-11-25):** el panel de Supabase exige SMTP propio para editar las plantillas de correo y se decidió seguir con el SMTP integrado. Los enlaces de correo pasan del flujo `token_hash` + `verifyOtp` al flujo PKCE con las plantillas **por defecto** (`{{ .ConfirmationURL }}`): `/auth/confirm` intercambia un `code` por sesión y la recuperación tiene su propia ruta, `/auth/recovery`. Cambios marcados con «(enmienda)».

---

## Por qué existe esta spec

Arcade Vault es una plataforma para competir por puntos, pero hoy cualquiera juega como «INVITADO» y teclea unas iniciales al guardar. La SPEC 03 dejó los clientes de Supabase listos y aplazó expresamente la sesión, las pantallas de acceso y `proxy.ts` a una spec de Auth. Esta es esa spec.

Estado de la plataforma el 2026-11-24 (comprobado en el repo y en Supabase): `auth.users` tiene 0 usuarios, no existe `proxy.ts` ni ninguna ruta de acceso, `public` solo tiene `games` y `scores`, y `lib/supabase/server.ts` ya ignora el fallo de `setAll` en Server Components esperando a que llegue el proxy. La nav tiene un hueco previsto: `app/globals.css` ya define `.av-nav .auth-btn`, sin uso todavía.

Esta spec entrega **identidad**, no **propiedad de las marcas**. El jugador puede registrarse, entrar y ver su nombre en la nav, pero guardar una puntuación sigue igual que hoy (iniciales tecleadas, inserción pública). Vincular `scores` al usuario es la spec siguiente. Así se puede revisar y probar la autenticación sin mezclarla con cambios de esquema y del Reproductor.

Es la spec más ancha hasta ahora (cinco flujos). Se mantiene en una sola, decidido con el usuario, y se organiza en pasos commiteables por separado: si OAuth se complica, los pasos de email ya funcionan solos.

## Alcance

**Dentro:**

- Configuración manual en el panel de Supabase y en las consolas de Google y GitHub (el MCP no puede hacerla): Site URL, Redirect URLs, «Confirm email» activado y proveedores OAuth. Las plantillas de correo se dejan **por defecto** y se usa el SMTP integrado de Supabase (enmienda).
- `proxy.ts` en la raíz: refresca la sesión de Supabase en cada petición de página y redirige según el estado de sesión (ver «Convenciones»).
- Pantallas, todas con la estética neón/CRT (usar `/frontend-design`): `/registro`, `/login`, `/recuperar` y `/restablecer`.
- Route handlers: `/auth/confirm` (cierra el enlace del correo de alta), `/auth/recovery` (cierra el enlace del correo de recuperación) y `/auth/callback` (cierra el flujo OAuth). Los tres intercambian un `code` por sesión (enmienda).
- Registro con **email, contraseña y nombre de jugador**; el nombre se guarda en `user_metadata.player_name`.
- Confirmación de correo obligatoria: tras registrarse se muestra «REVISA TU CORREO» y la sesión se abre al pulsar el enlace.
- Login con email y contraseña, y con **Google** y **GitHub** (botones en `/login` y `/registro`).
- Recuperación de contraseña: pedir el enlace en `/recuperar` y fijar la nueva contraseña en `/restablecer`.
- Cierre de sesión.
- Estado de sesión en React: `components/auth-provider.tsx` con `AuthProvider` y `useAuth()`, montado en `app/layout.tsx` dentro de `SupabaseProvider`.
- Nav: sin sesión, botón `ACCEDER`; con sesión, nombre del jugador y botón `SALIR`, en la barra y en el panel móvil.
- Helper `getPlayerName(user)` que devuelve el nombre del jugador, derivado del proveedor cuando el usuario entra con OAuth.
- Validación en el servidor (fuente de verdad) y en el formulario, con mensajes en español; errores de enlace con códigos cerrados (`?error=<codigo>`).
- Actualizar `CLAUDE.md` (secciones «Project», «Rutas» y «Supabase») y `README.md` para reflejar que ya hay Auth.

**Fuera de alcance (para otras specs):**

- Vincular `scores` al usuario: columna `user_id`, precargar el nombre en el modal «FIN DEL JUEGO», cambios en `submitScore`, en `game-player` o en `ScoresProvider`. El modal sigue con «INVITADO» e iniciales tecleadas.
- Tabla `public.profiles`, unicidad del nombre de jugador y trigger de alta de perfil.
- Endurecer RLS de `scores` o exigir login para jugar o guardar.
- Pantalla de cuenta o perfil (`/cuenta`), cambio de email, de nombre o de contraseña con sesión iniciada, y borrado de cuenta.
- Redirección tras el login a la página de origen (`?next=`): siempre va a `/`.
- Proveedores OAuth distintos de Google y GitHub, MFA, magic link y login anónimo.
- SMTP propio y plantillas de correo con diseño: se usan las plantillas de Supabase con el texto mínimo.
- Dominio y URLs de producción: solo se configuran las de desarrollo (`http://localhost:3000`).
- Sincronizar las marcas de `localStorage` con la cuenta.
- Página «Acerca de» y cualquier cambio del `CRÉDITOS · 03` de la nav.
- Migración o cambio de esquema en la base de datos (esta spec no crea tablas).
- Antitrampas, límites de intentos propios y CAPTCHA (se usan los límites por defecto de Supabase).
- Tests automatizados (no hay framework instalado).

## Modelo de datos

Esta spec no crea tablas ni migraciones: usa `auth.users` de Supabase. El nombre del jugador vive en los metadatos del usuario y el estado de sesión en React.

```ts
// Metadatos del usuario (auth.users.raw_user_meta_data), fijados en el registro con options.data
type UserMetadata = {
  player_name?: string; // solo en registro por email: 1–10 caracteres, ver regla abajo
  // En OAuth Supabase añade los del proveedor: user_name / full_name / name / avatar_url...
};
```

```ts
// lib/auth/player-name.ts
export const PLAYER_NAME_MAX = 10;
export const PLAYER_NAME_PATTERN = /^[A-Z0-9 _-]{1,10}$/; // tras recortar y pasar a mayúsculas
export function normalizePlayerName(raw: string): string;  // trim + toUpperCase (no sanea)
export function isValidPlayerName(name: string): boolean;  // cumple PLAYER_NAME_PATTERN
export function getPlayerName(user: User | null): string;
// 1) user_metadata.player_name; 2) user_name / full_name / name del proveedor;
// 3) parte local del email. Los casos 2 y 3 se sanean: sin acentos (NFD), en mayúsculas,
// solo [A-Z0-9 _-], recortado y con 10 caracteres como máximo. Si queda vacío: "JUGADOR".
```

```ts
// lib/auth/validation.ts — reglas compartidas por formularios y Server Actions
export const PASSWORD_MIN = 6;   // mínimo de Supabase (decisión del usuario)
export const PASSWORD_MAX = 72;  // límite de bcrypt
export const EMAIL_MAX = 254;
export function validateEmail(email: string): string | null;       // mensaje de error o null
export function validatePassword(password: string): string | null;
export function validatePlayerName(name: string): string | null;
```

```ts
// lib/actions/auth.ts  ("use server") — estado que devuelven las acciones de formulario
export type AuthFormState =
  | null
  | { ok: false; error: string; fields?: Partial<Record<"email" | "password" | "confirm" | "playerName", string>> }
  | { ok: true; notice: "revisa-correo" | "enlace-enviado" };

export async function signUp(prev: AuthFormState, form: FormData): Promise<AuthFormState>;
export async function signIn(prev: AuthFormState, form: FormData): Promise<AuthFormState>;           // éxito: redirect("/")
export async function requestPasswordReset(prev: AuthFormState, form: FormData): Promise<AuthFormState>;
export async function updatePassword(prev: AuthFormState, form: FormData): Promise<AuthFormState>;   // éxito: redirect("/")
export async function signInWithProvider(provider: "google" | "github"): Promise<void>;              // redirect al proveedor
export async function signOut(): Promise<void>;                                                       // redirect("/")
```

```ts
// components/auth-provider.tsx  ("use client")
export type AuthState =
  | { status: "loading" }                 // servidor y primer render del cliente
  | { status: "guest" }
  | { status: "authed"; user: User };
export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
export function useAuth(): AuthState;     // lanza si se usa fuera del provider
```

```ts
// lib/auth/messages.ts — códigos cerrados que viajan en la URL (?error=<codigo>)
export const AUTH_ERROR_MESSAGES: Record<string, string>;
// "enlace-invalido" | "enlace-caducado" | "oauth-cancelado" | "oauth-fallo" | "correo-sin-confirmar"
export function authErrorMessage(code: string | null): string | null; // un código desconocido devuelve un mensaje genérico
```

Rutas nuevas:

| Ruta | Tipo | Con sesión | Sin sesión |
| ---- | ---- | ---------- | ---------- |
| `/registro` | página | redirige a `/` | accesible |
| `/login` | página | redirige a `/` | accesible |
| `/recuperar` | página | redirige a `/` | accesible |
| `/restablecer` | página | accesible (llega con la sesión de recuperación) | redirige a `/recuperar` |
| `/auth/confirm` | route handler `GET` | intercambia `code` por sesión (alta por email) | idem |
| `/auth/recovery` | route handler `GET` | intercambia `code` por sesión (recuperación) y va a `/restablecer` | idem |
| `/auth/callback` | route handler `GET` | intercambia `code` por sesión (OAuth) | idem |

Archivos nuevos: `proxy.ts`, `lib/supabase/proxy.ts`, `lib/auth/{player-name,validation,messages}.ts`, `lib/actions/auth.ts`, `app/auth/confirm/route.ts`, `app/auth/recovery/route.ts`, `app/auth/callback/route.ts`, `app/{registro,login,recuperar,restablecer}/page.tsx`, `components/auth-provider.tsx` y los componentes de formulario (`register-form`, `login-form`, `recover-form`, `reset-form`, `oauth-buttons`, `user-menu`; los nombres exactos los fija la implementación). Archivos modificados: `components/nav.tsx`, `app/layout.tsx`, `app/globals.css` (clases `.auth-*`), el comentario de `setAll` en `lib/supabase/server.ts`, `CLAUDE.md` y `README.md`. **No se modifican** `lib/actions/scores.ts`, `components/scores-provider.tsx`, `components/game-player.tsx` ni nada bajo `lib/<juego>/`.

Convenciones:

- **Sesión en el servidor:** `proxy.ts` crea un cliente con `createServerClient` sobre las cookies de la petición, llama a `getClaims()` (valida la firma del JWT; nunca `getSession()` para decidir acceso) y reescribe las cookies refrescadas en la respuesta. El `matcher` excluye `_next/static`, `_next/image`, `favicon.ico`, `/games/` y las imágenes estáticas. Antes de escribirlo hay que leer `01-app/03-api-reference/03-file-conventions/proxy.md` (en Next 16 `middleware` se llama `proxy`).
- **Redirecciones del proxy:** con sesión, `/login`, `/registro` y `/recuperar` redirigen a `/`; sin sesión, `/restablecer` redirige a `/recuperar`. El proxy no protege ninguna otra ruta: la plataforma sigue abierta a invitados.
- **Sesión en el navegador:** `AuthProvider` obtiene el usuario con `supabase.auth.onAuthStateChange` (el evento `INITIAL_SESSION` resuelve el estado inicial) y cancela la suscripción al desmontar. Parte de `{ status: "loading" }` para que servidor y primer render del cliente coincidan. Es solo para pintar la interfaz; ninguna decisión de acceso se toma con él. **No se lee `cookies()` en `app/layout.tsx`**, así el resto de rutas se sigue prerenderizando con `cacheComponents`.
- **Origen de las URLs de retorno:** `emailRedirectTo` y `redirectTo` se construyen con la cabecera `origin` de la petición, sin variable de entorno nueva. Supabase solo acepta las que están en su lista de Redirect URLs, así que una cabecera falsa no abre una redirección a otro dominio.
- **Redirección tras éxito:** siempre `/`. Los códigos de error de la URL se resuelven con `authErrorMessage`; nunca se pinta un texto recibido por URL. Las páginas que leen `?error=` lo hacen en un componente dentro de `<Suspense>` (regla de `cacheComponents`; ver `authentication-with-cache-components.md`).
- **Formularios:** React 19 `useActionState` con las acciones de `lib/actions/auth.ts`; atributos HTML de apoyo (`required`, `type="email"`, `minLength`, `maxLength`, `autoComplete`). La validación del servidor es la que manda y repite las reglas de `lib/auth/validation.ts`.
- **Registro por email:** `supabase.auth.signUp({ email, password, options: { data: { player_name }, emailRedirectTo: <origin>/auth/confirm } })`. Con «Confirm email» activo no hay sesión hasta pulsar el enlace; el formulario pasa a «REVISA TU CORREO».
- **Enlaces de correo (enmienda):** las plantillas «Confirm sign up» y «Reset password» se dejan por defecto (`{{ .ConfirmationURL }}`). Ese enlace pasa por Supabase y vuelve al `redirect_to` con `?code=...` (flujo PKCE). `signUp` usa `emailRedirectTo: <origin>/auth/confirm` y `requestPasswordReset` usa `redirectTo: <origin>/auth/recovery`. Cada handler llama a `exchangeCodeForSession(code)`: `/auth/confirm` redirige a `/` y `/auth/recovery` a `/restablecer`. Si Supabase devuelve `?error=...&error_code=otp_expired`, o falta el `code`, o falla el intercambio, se redirige a `/login?error=enlace-caducado` (caso `otp_expired`) o `enlace-invalido` (cualquier otro). Como el verificador PKCE vive en una cookie, el enlace solo funciona en el navegador donde se pidió el alta o la recuperación.
- **OAuth:** `signInWithProvider` llama a `signInWithOAuth({ provider, options: { redirectTo: <origin>/auth/callback } })` en el servidor y hace `redirect(data.url)`, de modo que el verificador PKCE queda en cookies del servidor. `/auth/callback` llama a `exchangeCodeForSession(code)` y redirige a `/`; si el usuario cancela o falla, a `/login?error=oauth-cancelado` o `oauth-fallo`.
- **Mensajes de login:** credenciales incorrectas → «CORREO O CONTRASEÑA INCORRECTOS» (el mismo mensaje exista o no la cuenta); correo sin confirmar (`email_not_confirmed`) → mensaje propio con el aviso de revisar la bandeja. Un registro con un correo ya existente muestra el mismo «REVISA TU CORREO» que uno nuevo (Supabase lo oculta para no revelar qué correos tienen cuenta).
- **Nav con sesión:** nombre = `getPlayerName(user)` y `SALIR` es un formulario que invoca `signOut`. Durante `status: "loading"` se reserva el hueco (ancho fijo) para que no salte el diseño. Convive con `CRÉDITOS · 03`, que no cambia.
- **Estilo:** tokens y clases de `app/globals.css` (`.btn`, `.pixel`, `--cyan`, `--magenta`…); las clases nuevas llevan el prefijo `.auth-`. Responsive con el mismo salto de 820 px de la nav.
- **Guías de Next que hay que leer antes de cada paso (regla de `AGENTS.md`):** `01-app/02-guides/authentication.md`, `authentication-with-cache-components.md`, la de `proxy.md`, la de route handlers y la de formularios. Para Supabase, `search_docs` del MCP («server-side auth Next.js», «PKCE», «OAuth») antes de escribir las acciones.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Para la interfaz se usa siempre `/frontend-design`.

1. **Configuración manual del correo (la hace el usuario).** En el panel de Supabase: *Authentication → URL Configuration* con Site URL `http://localhost:3000` y Redirect URLs `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/recovery` y `http://localhost:3000/auth/callback`; *Providers → Email* con «Confirm email» activado y longitud mínima de contraseña 6. Las plantillas de correo y el SMTP se dejan por defecto (enmienda). Los correos solo llegan a direcciones del equipo del proyecto (ver «Riesgos»). Verificación: el panel muestra cada ajuste; sin código todavía.
2. **Base de sesión.** Crear `lib/supabase/proxy.ts` y `proxy.ts` (refresco con `getClaims()` y las dos reglas de redirección), `lib/auth/{player-name,validation,messages}.ts`, `components/auth-provider.tsx`, y montar `AuthProvider` en `app/layout.tsx` dentro de `SupabaseProvider`; actualizar el comentario de `setAll` en `lib/supabase/server.ts`. Verificación: `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan; `/`, `/juegos`, `/salon` y `/juegos/rocas/jugar` responden 200 y no cambian de aspecto; `useAuth()` devuelve `guest` sin sesión; la consola no muestra avisos de hidratación.
3. **Registro y confirmación de correo.** Crear `signUp` en `lib/actions/auth.ts`, `app/registro/page.tsx` con su formulario, `app/auth/confirm/route.ts` (intercambio de `code`), las clases `.auth-*` de `app/globals.css` y la pantalla «REVISA TU CORREO». Verificación: registrarse con un correo permitido por el SMTP deja un usuario sin confirmar en `auth.users` con `raw_user_meta_data.player_name`; el enlace del correo abre sesión y lleva a `/`; un enlace repetido o manipulado lleva a `/login?error=enlace-invalido`.
4. **Login, logout y nav.** Crear `signIn` y `signOut`, `app/login/page.tsx`, el menú de usuario y el cambio de `components/nav.tsx` (barra y panel móvil). Verificación: con la cuenta del paso 3 se entra y la nav muestra el nombre y `SALIR`; `SALIR` vuelve a `ACCEDER`; con sesión, `/login` y `/registro` redirigen a `/`; el ciclo jugar → guardar → ver en el ranking sigue igual que antes.
5. **Recuperación de contraseña.** Crear `requestPasswordReset` y `updatePassword`, `app/recuperar/page.tsx`, `app/restablecer/page.tsx` y `app/auth/recovery/route.ts`; enlace «¿Olvidaste tu contraseña?» en `/login`. Verificación: el correo de recuperación llega, el enlace abre `/restablecer` con sesión, la nueva contraseña permite entrar tras `SALIR`, y `/restablecer` sin sesión redirige a `/recuperar`.
6. **Configuración manual de OAuth (la hace el usuario).** Crear la OAuth App de GitHub y el cliente OAuth de Google Cloud con la URL de callback que muestra Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`), pegar Client ID y Secret en *Authentication → Providers* y activarlos. Verificación: ambos proveedores aparecen habilitados en el panel; los secretos no se copian al repo ni a `.env`.
7. **OAuth en el código y documentación.** Crear `signInWithProvider`, `app/auth/callback/route.ts`, `components/oauth-buttons.tsx` en `/login` y `/registro`, y actualizar `CLAUDE.md` y `README.md`. Verificación: entrar con GitHub y con Google crea el usuario, abre sesión y la nav muestra `getPlayerName(user)`; cancelar en el proveedor lleva a `/login?error=oauth-cancelado`; `npx tsc --noEmit`, `npm run build` y `npx eslint app components lib` pasan.

## Criterios de aceptación

**Proyecto y regresión**

- [ ] `npx tsc --noEmit`, `npm run build` y `npx eslint app components lib` terminan sin errores.
- [ ] `/`, `/juegos`, `/juegos/rocas`, `/juegos/rocas/jugar` y `/salon` responden 200 y conservan su aspecto, salvo el botón de la nav.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/login`, `/registro`, `/recuperar` y `/juegos/rocas/jugar`.
- [ ] `lib/actions/scores.ts`, `components/scores-provider.tsx`, `components/game-player.tsx` y `lib/<juego>/` no aparecen en `git diff` de esta spec.
- [ ] Como invitado y con sesión, el modal «FIN DEL JUEGO» sigue mostrando «INVITADO» y guardar una marca sigue funcionando igual (localStorage y fila en `scores`).
- [ ] `public` no tiene tablas ni migraciones nuevas: `list_tables` sigue mostrando solo `games` y `scores`.

**Secretos y configuración**

- [ ] `grep -rn "service_role\|SERVICE_ROLE" app components lib proxy.ts` no devuelve resultados.
- [ ] Los Client Secret de Google y GitHub no aparecen en el repo ni en `.env`, y `.env.template` no cambia (no hay variables nuevas).
- [ ] `git ls-files` no incluye `.env`.
- [ ] En el panel de Supabase constan: Site URL y las dos Redirect URLs de desarrollo, «Confirm email» activado y la lista de Redirect URLs incluye `/auth/confirm`, `/auth/recovery` y `/auth/callback`; las plantillas siguen por defecto (enmienda: sin plantillas propias).

**Proxy y sesión**

- [ ] `proxy.ts` existe en la raíz, usa `getClaims()` y no usa `getSession()` para decidir redirecciones.
- [ ] Con sesión, pedir `/login`, `/registro` o `/recuperar` devuelve una redirección a `/`.
- [ ] Sin sesión, pedir `/restablecer` devuelve una redirección a `/recuperar`.
- [ ] El `matcher` no ejecuta el proxy sobre `_next/static`, `_next/image`, `favicon.ico` ni `/games/…`.
- [ ] `app/layout.tsx` no importa `cookies` ni `headers`.
- [ ] `useAuth()` devuelve `loading` en el primer render del cliente, y después `guest` o `authed`; usarlo fuera de `AuthProvider` lanza un `Error` con mensaje en español.
- [ ] Entrar y salir varias veces de una página no acumula suscripciones de `onAuthStateChange` (se cancela al desmontar).

**Registro**

- [ ] `/registro` muestra campos de correo, contraseña, repetir contraseña y nombre de jugador, un botón de registro, los botones de Google y GitHub y un enlace a `/login`.
- [ ] Un envío con correo inválido, contraseña de menos de 6 o más de 72 caracteres, contraseñas distintas o nombre vacío o de más de 10 caracteres muestra el error junto al campo y no crea usuario.
- [ ] El nombre `dani_01` se guarda como `DANI_01` y `d@ni!` se rechaza por caracteres no válidos.
- [ ] Un registro válido crea el usuario en `auth.users` sin confirmar, con `raw_user_meta_data.player_name` en mayúsculas, y la pantalla muestra «REVISA TU CORREO» sin abrir sesión.
- [ ] Registrar un correo que ya existe muestra el mismo «REVISA TU CORREO» y no revela que la cuenta existe.
- [ ] El enlace del correo de confirmación abre sesión y lleva a `/`; usarlo una segunda vez lleva a `/login?error=enlace-invalido` o `enlace-caducado`.

**Login y logout**

- [ ] `/login` muestra correo, contraseña, botón de entrar, enlace «¿Olvidaste tu contraseña?», enlace a `/registro` y los botones de Google y GitHub.
- [ ] Un login correcto abre sesión y lleva a `/`.
- [ ] Un correo o contraseña incorrectos muestran «CORREO O CONTRASEÑA INCORRECTOS», con el mismo mensaje si la cuenta no existe.
- [ ] Un usuario sin confirmar que intenta entrar ve el aviso de confirmar el correo.
- [ ] `/login?error=oauth-cancelado` muestra su mensaje, y `/login?error=<texto-cualquiera>` muestra solo el mensaje genérico, nunca el texto recibido.
- [ ] `SALIR` cierra la sesión, lleva a `/` y la nav vuelve a mostrar `ACCEDER`; recargar la página sigue sin sesión.

**Recuperación de contraseña**

- [ ] `/recuperar` pide el correo y muestra siempre «ENLACE ENVIADO» exista o no la cuenta.
- [ ] El enlace del correo de recuperación abre `/restablecer` con sesión.
- [ ] `/restablecer` valida las mismas reglas de contraseña, exige que coincidan y, al guardar, lleva a `/` con la sesión abierta.
- [ ] Tras `SALIR`, solo la contraseña nueva permite entrar; la antigua da el error de credenciales.

**OAuth**

- [ ] El botón de GitHub lleva a la pantalla de autorización de GitHub y, al aceptar, vuelve a `/` con sesión.
- [ ] El botón de Google lleva a la pantalla de Google y, al aceptar, vuelve a `/` con sesión.
- [ ] Cancelar en el proveedor lleva a `/login?error=oauth-cancelado` sin sesión y sin error en consola.
- [ ] Un usuario OAuth aparece en `auth.users` con su proveedor y `getPlayerName(user)` devuelve un nombre que cumple `PLAYER_NAME_PATTERN`.

**`getPlayerName`**

- [ ] `user_metadata.player_name = "DANI"` → `DANI`.
- [ ] `user_name = "danny-vasquez-23"` → `DANNY-VASQ`.
- [ ] `full_name = "María José Pérez"` → `MARIA JOSE`.
- [ ] Sin metadatos y con `email = "ana.garcia@ejemplo.com"` → `ANAGARCIA`.
- [ ] Un nombre que tras sanear queda vacío (por ejemplo solo emojis) → `JUGADOR`.
- [ ] Sin usuario (`null`) → `JUGADOR`.

**Nav e interfaz**

- [ ] Sin sesión, la nav muestra `ACCEDER`, que lleva a `/login`; con sesión muestra `getPlayerName(user)` y `SALIR`. Ambos estados se ven también en el panel móvil.
- [ ] Mientras `useAuth()` está en `loading`, la nav reserva el hueco y no salta el diseño al resolverse.
- [ ] Las pantallas de acceso usan los tokens de `app/globals.css` (sin colores literales nuevos fuera de ese archivo) y, por debajo de 820 px, el formulario cabe sin scroll horizontal.
- [ ] Los campos tienen `label` o `aria-label`, `autoComplete` adecuado (`email`, `current-password`, `new-password`, `username`) y los errores se asocian al campo.
- [ ] Todos los textos visibles están en español.

## Decisiones tomadas y descartadas

- **Sí:** email y contraseña más OAuth con Google y GitHub, por decisión del usuario. **No:** solo email (más corto, pero sin acceso social) ni magic link (no encaja con una pantalla de registro y login clásicas).
- **Sí:** confirmación de correo obligatoria con enlace por defecto de Supabase y flujo PKCE (`code` + `exchangeCodeForSession` en `/auth/confirm` y `/auth/recovery`), porque editar las plantillas exige SMTP propio (enmienda, decidido con el usuario). **No:** `token_hash` + `verifyOtp` con plantillas propias (era lo previsto) ni sesión inmediata sin verificar el correo. Consecuencia aceptada: el enlace solo vale en el mismo navegador donde se pidió.
- **Sí:** recuperación de contraseña dentro de esta spec, por decisión del usuario. **No:** aplazarla (se recomendó dejarla fuera: añade dos pantallas, otra plantilla y otro flujo de tokens).
- **Sí:** nombre de jugador en `user_metadata.player_name`, por decisión del usuario. **No:** tabla `profiles`. Consecuencias aceptadas: el nombre no es único, un usuario podría cambiarlo desde el cliente con `updateUser` y no se puede consultar desde SQL para los rankings. Nada de eso importa mientras el nombre solo se muestre; la spec que vincule `scores` a usuarios tendrá que decidir si hace falta `profiles`.
- **Sí:** el nombre del registro por email es obligatorio y sigue la regla de `scores.player_name` (1–10 caracteres, en mayúsculas). **No:** reutilizar sin más el campo libre del modal, que admite cualquier carácter.
- **Sí:** para OAuth el nombre se deriva del proveedor con `getPlayerName` y se calcula al mostrarlo. **No:** una pantalla `/bienvenida` obligatoria tras el primer login (más fricción y otra ruta), ni escribir el nombre derivado en `user_metadata` (más escrituras sin necesidad).
- **Sí:** contraseña de 6 a 72 caracteres, el mínimo de Supabase, por decisión del usuario. **No:** 8 o más, que fue la recomendación (contraseñas débiles aceptadas conscientemente). El máximo de 72 es el límite de bcrypt.
- **Sí:** esta spec es solo autenticación; `scores` queda tal cual. **No:** `scores.user_id`, precarga del nombre en el modal ni login obligatorio para jugar (decisiones de producto y de esquema que merecen su spec).
- **Sí:** dos rutas separadas, `/login` y `/registro`, en español como `/juegos` y `/salon`. **No:** una sola `/auth` con pestañas (el estado de la pestaña complica la URL y las redirecciones).
- **Sí:** nav con nombre y `SALIR`, sin página de cuenta. **No:** `/cuenta` (no hay nada que gestionar todavía).
- **Sí:** tras cualquier flujo se va siempre a `/`. **No:** `?next=`, que exige validar la ruta en login, confirmación y OAuth.
- **Sí:** una sola spec, organizada en siete pasos con dos de configuración manual, por decisión del usuario. **No:** dividir en «email» y «OAuth» (se recomendó mantenerla junta por la continuidad de formularios y proxy; los pasos 1–5 funcionan sin OAuth).
- **Sí:** estado de sesión del cliente con `onAuthStateChange` en `AuthProvider`, sin leer cookies en el layout. Mantiene el prerender de las rutas con `cacheComponents`. **No:** `getUser()` en el layout (volvería dinámica toda la aplicación).
- **Sí:** las decisiones de acceso, si se añaden, se toman en el servidor con `getClaims()`. **No:** fiarse de `useAuth()` ni de `getSession()`, que leen datos que el cliente puede manipular.
- **Sí:** acciones de servidor para registro, login, OAuth y cierre de sesión: las cookies de sesión y el verificador PKCE se escriben en el servidor. **No:** llamar a `supabase.auth.*` desde el navegador para esos flujos.
- **Sí:** `origin` de la petición para las URLs de retorno. **No:** variable `NEXT_PUBLIC_SITE_URL`: Supabase ya valida el destino contra su lista de Redirect URLs.
- **Sí:** mensajes de error por códigos cerrados en la URL y mensaje genérico para los desconocidos. **No:** pintar un texto recibido por URL (inyección de contenido).
- **Sí:** mismo mensaje para credenciales incorrectas exista o no la cuenta, y para registros con un correo repetido. **No:** distinguirlos: revelaría qué correos tienen cuenta.
- **Sí:** el proxy solo refresca la sesión y redirige las cuatro pantallas de acceso. **No:** proteger otras rutas (la plataforma sigue abierta a invitados).
- **Sí:** configuración manual guiada en los pasos 1 y 6, dentro del plan. **No:** darla por hecha: el MCP no puede crear apps OAuth ni editar las plantillas.
- **Sí:** solo URLs de desarrollo (`localhost:3000`) en la configuración. **No:** dominio de producción, que no existe todavía.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| El SMTP por defecto de Supabase tiene un límite de envíos muy bajo y, según su documentación vigente, solo entrega a direcciones autorizadas del equipo del proyecto. Registrarse o recuperar la contraseña con un correo cualquiera puede no llegar nunca | Comprobarlo en el paso 1 y probar con un correo permitido. Para que usuarios reales se registren hace falta SMTP propio, fuera de esta spec; queda registrado como requisito previo a abrir la plataforma. |
| Con el flujo PKCE de los correos, abrir el enlace en otro navegador o dispositivo falla (falta el verificador en la cookie) y se muestra `enlace-invalido` (enmienda) | Aceptado en desarrollo: se prueba en el mismo navegador. Para soportar otros dispositivos hará falta SMTP propio y plantillas con `token_hash`, en otra spec. |
| Un correo normal y uno entrado por Google o GitHub con la misma dirección pueden terminar en la misma cuenta (Supabase vincula identidades por correo verificado) | Es el comportamiento por defecto y es aceptable aquí. Se comprueba en el paso 7 que el usuario OAuth queda con una sola fila en `auth.users` y se anota el resultado en la implementación. |
| `user_metadata` es editable por el propio usuario | Solo se usa para mostrar el nombre; ninguna regla de acceso ni RLS lo lee. Anotado en las decisiones para la spec que vincule `scores`. |
| Dos jugadores pueden usar el mismo nombre | Aceptado (no hay `profiles`). No afecta a nada mientras `scores` siga con iniciales libres. |
| Mal configurada la lista de Redirect URLs, el enlace del correo o OAuth falla con un error opaco de Supabase | El paso 1 y el paso 6 verifican cada URL en el panel; los fallos se muestran como `enlace-invalido` u `oauth-fallo`. |
| Al desplegar, las URLs `localhost` no valen y los enlaces apuntarán a un sitio inexistente | Fuera de alcance: al publicar la app hay que añadir su dominio a Site URL y Redirect URLs. Se documenta en `README.md` en el paso 7. |
| `cacheComponents` rompe el prerender si una página lee `searchParams` o `cookies()` fuera de `<Suspense>` | Las páginas de acceso leen `?error=` en un componente envuelto en `<Suspense>`; el layout no lee cookies. El `npm run build` de los criterios lo detecta. |
| `proxy.ts` se ejecuta en cada petición y encarece las páginas estáticas | El `matcher` excluye los recursos estáticos; la llamada es `getClaims()`, que valida el JWT en local y no consulta la red salvo que haga falta refrescarlo. |
| El verificador PKCE se pierde si el flujo OAuth no empieza y termina en el mismo navegador y dominio | El flujo empieza en una acción de servidor que guarda la cookie y termina en `/auth/callback` del mismo origen; el criterio de OAuth lo comprueba de principio a fin. |
| Strict Mode monta el efecto del provider dos veces y quedan dos suscripciones | La suscripción se cancela en el cleanup del efecto; hay un criterio de aceptación. |
| Una variable de entorno o un secreto de OAuth se filtra al repo | No hay variables nuevas; los secretos solo se pegan en el panel de Supabase. Dos criterios lo comprueban con `grep` y `git ls-files`. |
| Un invitado pierde la navegación esperada (por ejemplo, venía del Reproductor y tras el login cae en `/`) | Aceptado: no hay `?next=`. Entrar es opcional y el Reproductor no exige sesión. |

## Lo que **no** entra en esta spec

- Vincular puntuaciones al usuario, precargar el nombre en el modal o cambiar `scores` y `submitScore`.
- Tabla `profiles`, nombres únicos y triggers.
- Login obligatorio, RLS más estricta o antitrampas.
- Página `/cuenta`, cambio de email, nombre o contraseña con sesión iniciada y borrado de cuenta.
- Redirección a la página de origen (`?next=`).
- Otros proveedores OAuth, MFA, magic link y login anónimo.
- SMTP propio, plantillas de correo con diseño y URLs de producción.
- Cambios de esquema o migraciones en Supabase.
- Sincronizar `localStorage` con la cuenta.
- Página «Acerca de» y cambios del `CRÉDITOS · 03`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
