## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Cuentas de jugador

Arcade Vault usa **Supabase Auth**: registro con correo y contraseña (con confirmación por correo), acceso con Google y GitHub, y recuperación de contraseña. Entrar es opcional: se puede jugar como invitado. Por ahora las puntuaciones **no** se vinculan a la cuenta: al guardar una marca se siguen tecleando las iniciales.

| Ruta | Para qué sirve |
| ---- | -------------- |
| `/registro` | Crear cuenta (correo, contraseña y nombre de jugador de hasta 10 caracteres). |
| `/login` | Entrar con correo y contraseña, Google o GitHub. |
| `/recuperar` | Pedir el enlace para elegir una contraseña nueva. |
| `/restablecer` | Fijar la contraseña nueva (solo con el enlace del correo). |

### Configuración en Supabase (una vez por proyecto)

Estos ajustes se hacen a mano en el [panel de Supabase](https://supabase.com/dashboard); no se pueden aplicar desde el código.

1. **Authentication → URL Configuration**
   - *Site URL*: `http://localhost:3000`.
   - *Redirect URLs*: `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/recovery` y `http://localhost:3000/auth/callback`.
2. **Authentication → Sign In / Providers → Email**: «Confirm email» activado y longitud mínima de contraseña `6`.
3. **Google y GitHub** (*Authentication → Sign In / Providers*): crea la OAuth App de GitHub y el cliente OAuth de Google Cloud con la URL de callback que muestra Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`), pega el *Client ID* y el *Client Secret* en el panel y activa el proveedor. **Los secretos solo van en el panel de Supabase**: no los pegues en el repo ni en `.env`.
4. Las plantillas de correo se dejan **por defecto**.

No hay variables de entorno nuevas: solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ver `.env.template`).

### Limitaciones conocidas

- **Correo.** Con el SMTP integrado de Supabase los correos (confirmación y recuperación) solo se entregan a direcciones del equipo de la organización y con un límite bajo de envíos por hora. Para que usuarios reales se registren hace falta configurar un SMTP propio (*Authentication → SMTP*).
- **Enlaces de correo.** Usan el flujo PKCE con las plantillas por defecto: el enlace solo funciona en el **mismo navegador** donde se pidió el registro o la recuperación.
- **Al desplegar.** Las URLs `localhost` no valen en producción: añade el dominio real a *Site URL* y a *Redirect URLs* (las tres rutas `/auth/...`) y a las URLs de retorno de los proveedores OAuth si las restringes.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
