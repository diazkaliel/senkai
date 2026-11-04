# SENKAI / Ventana de mantenimiento — pedidos reales

## Alcance

La aplicación actual de producción (release v11) **no contiene** este middleware.
El marcador solo será interpretado por la versión que incorpore este cambio.
No se debe confiar en él para detener pedidos antes del primer despliegue.

El código nuevo comprueba la existencia de `/app/storage/.senkai-maintenance`
antes de atender métodos HTTP que escriben en `/api/v1`.
Con marcador presente: `503`, `code=MAINTENANCE_MODE`, `Retry-After=120`.
`GET`, `HEAD`, `OPTIONS` y `/health` siguen accesibles. Los POST de
cotización se bloquean también durante mantenimiento, por seguridad.

No existe activación por URL pública, token o parámetro de consulta; únicamente
operación sobre el volumen con autorización de infraestructura.

## Antes de publicar (no ejecutar sin autorización expresa)

1. Anunciar una ventana de indisponibilidad; coordinar personal de taller.
2. Verificar imagen y digest de v11, HEAD de PR, checks y espacio disponible.
3. Prohibir temporalmente cambios administrativos y subidas directas fuera de la API.
4. Retirar la máquina antigua del enrutamiento con el comando de `cordon`
   confirmado contra el `flyctl` instalado. Esto provoca indisponibilidad pública
   porque actualmente existe una sola máquina.
5. Esperar a que finalicen solicitudes en curso y confirmar que no quedan
   escrituras activas. Cordon no cancela conexiones existentes.
6. Crear el marcador en `/app/storage` **antes** del despliegue. La versión
   antigua lo ignorará; la nueva lo detectará desde su arranque.
7. Generar respaldo externo fresco con la API de backup de SQLite, además de
   `/app/storage/uploads`. Verificar hashes, integridad y último folio.
   No copiar aisladamente el archivo `.db` mientras SQLite usa WAL.
8. Solo con autorización separada, fusionar PR y desplegar conservando el
   volumen existente. Verificar versión, `/health` y que POST inválido de
   checkout devuelve 503, sin enviar pedidos reales de prueba.
9. Si las comprobaciones pasan, autorizar retirada del marcador y reapertura
   de tráfico; comprobar un POST inválido (422) y supervisar pedidos reales.
10. Comparar los nuevos folios con el corte del respaldo. Jamás restaurar
    automáticamente un respaldo antiguo sobre pedidos posteriores.

## Activación / desactivación (referencia operativa, no ejecutada)

Con la versión nueva desplegada y conexión SSH autorizada:

- Activar: `touch /app/storage/.senkai-maintenance` como `appuser`.
- Confirmar: comprobar que el archivo existe y que checkout devuelve 503.
- Desactivar: `rm /app/storage/.senkai-maintenance` como `appuser`,
  **solo tras autorización para reabrir**.
- Confirmar: comprobar que un POST inválido devuelve 422.

No borrar el archivo para "arreglar" una incidencia sin antes revisar
los pedidos y la consistencia de los datos.

## Si algo falla

- Antes del despliegue: no iniciar el despliegue; resolver la causa y
  restaurar el enrutamiento anterior solo cuando sea seguro.
- Después del despliegue: conservar el marcador, investigar logs, salud,
  esquema y volumen. Revertir la imagen solo con aprobación expresa,
  porque v11 reintroduce comportamientos inseguros corregidos en PR #3.
- Nunca sobrescribir SQLite ni los uploads con respaldos antiguos si se
  desconoce si existen pedidos o diseños creados después del corte.
- La activación del marcador no interrumpe peticiones ya admitidas: se
  requiere primero cortar el enrutamiento y drenar solicitudes para el
  respaldo consistente.

## Limitaciones

Este mecanismo cubre las escrituras HTTP del backend actual. No bloquea
scripts por SSH, herramientas de migración ni procesos ajenos al servidor.
No asegura tiempo de inactividad cero: el servicio usa una máquina y un volumen
SQLite. La operativa debe verificarse en QA antes de utilizarse en producción.
