# Respaldo anterior al rediseño experimental

Se copiaron los 26 archivos del proyecto (sin `.git`) y se verificaron sus hashes SHA-256 antes de modificar el diseño. `originales` conserva las copias exactas, incluidos los cambios que ya estaban pendientes. No eliminar este respaldo sin autorización.

## Archivos que modifica el rediseño

- `index.html`: presentación de las siete tarjetas y etiqueta accesible del buscador.
- `style.css`: estilos limitados a las tarjetas nuevas y al panel de búsqueda.

No se modifican JavaScript, Service Worker, versiones, PDF, datos, formularios ni otras secciones.

## Restaurar

Desde PowerShell en la carpeta del proyecto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\BACKUP_ANTES_REDISENO\RESTAURAR.ps1
```

El script valida los originales y restaura únicamente `index.html` y `style.css`, byte por byte, sin cambiar el índice ni la rama de Git. Conserva el respaldo y los archivos auxiliares de verificación dentro de esta carpeta. Recargar con Ctrl+F5.

La restauración está pensada para deshacer esta prueba. Si posteriormente se editan estos mismos dos archivos, revisar primero esas modificaciones para preservarlas.

## Punto adicional en Git

Ver `punto-restauracion-git.txt`. La rama de respaldo incluye el estado de trabajo previo, incluso los cambios sin commit. Se creó con un índice temporal, sin cambiar la rama activa, el índice original ni los archivos de trabajo. `git-status-antes.txt` registra los cambios anteriores.
