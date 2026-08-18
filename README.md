# Turno360

Planificador diario de trabajadores y actividades construido con React, Vite y TypeScript.

## Ejecutar

```bash
npm install
npm run dev
```

## Comandos

```bash
npm run test
npm run lint
npm run build
```

## Datos

Durante el MVP, la aplicación guarda el estado en `LocalStorage` bajo la clave `turno360:state`. El contenido es JSON y se puede respaldar desde **Configuración > Respaldo de información**.

Antes de limpiar el navegador o cambiar de equipo:

1. Exporta un respaldo JSON.
2. En el nuevo navegador abre Turno360.
3. Usa **Importar JSON**.
4. Comprueba trabajadores, actividades y asignaciones.

## Migración futura a Supabase

La migración no requiere cambiar el formato usado por la interfaz. El JSON exportado se puede transformar en estas tablas:

- `workers`: trabajadores y configuración de descanso.
- `activities`: actividades, duración y mínimo de personas.
- `shifts`: horarios configurables.
- `assignments`: trabajador, actividad, fecha y turno.
- `unavailability`: vacaciones, permisos y descansos.

Proceso recomendado:

1. Exportar el JSON desde Turno360.
2. Crear las tablas en Supabase.
3. Ejecutar un script de importación que conserve los `id` existentes.
4. Verificar conteos y fechas importadas.
5. Cambiar el store local por un store sincronizado con Supabase.
6. Mantener exportación JSON como respaldo manual.

Mientras exista un solo administrador y un solo equipo, `LocalStorage + respaldo JSON` es suficiente. Supabase será útil cuando se necesite acceso desde varios dispositivos, copias automáticas o autenticación.

## Publicar en GitHub Pages

El proyecto incluye el workflow `.github/workflows/deploy.yml`. Para publicarlo:

1. Crea un repositorio vacío en GitHub, por ejemplo `Turno360`.
2. Desde la carpeta del proyecto ejecuta:

```bash
git init
git add .
git commit -m "Initial Turno360 app"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

3. En GitHub abre `Settings > Pages`.
4. En `Build and deployment`, selecciona `GitHub Actions` como fuente.
5. Abre la pestaña `Actions` y espera a que finalice `Deploy Turno360 to GitHub Pages`.
6. La aplicación quedará disponible en:

```text
https://TU_USUARIO.github.io/TU_REPOSITORIO/
```

Cada nuevo `git push` a `main` volverá a construir y publicar la aplicación automáticamente.

### Importante sobre LocalStorage

Los datos se guardan en el navegador y dominio donde abras la aplicación. No se comparten automáticamente entre computadores o navegadores. Antes de cambiar de dispositivo, usa `Configuración > Exportar JSON` y luego `Importar JSON` en el nuevo dispositivo.
