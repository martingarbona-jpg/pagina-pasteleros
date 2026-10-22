# Ajuste de especialidades en escritorio

Único archivo del proyecto modificado en este ajuste: `style.css`.

La copia `style.css` de esta carpeta conserva el rediseño visual previo, antes del ajuste de especialidades. Su hash SHA-256 está en `registro.json`.

Para deshacer únicamente este ajuste, ejecutar desde la raíz del proyecto:

```powershell
Copy-Item -LiteralPath .\BACKUP_AJUSTE_ESPECIALIDADES_20261016-103741\style.css -Destination .\style.css -Force
```

El respaldo `BACKUP_ANTES_REDISENO` sigue intacto y permite revertir todo el rediseño, incluido este ajuste. No se modificaron versiones de caché, JavaScript, datos ni enlaces.
