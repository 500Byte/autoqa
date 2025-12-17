# AutoQA - Electron Desktop App

AutoQA es una herramienta de Quality Assurance automatizada para análisis de SEO, accesibilidad y enlaces rotos en sitios web. Disponible como aplicación web Next.js y aplicación de escritorio Electron.

## 🚀 Inicio Rápido

### Modo Web (Next.js)

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Abrir en navegador
http://localhost:3000
```

### Modo Desktop (Electron)

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar aplicación de escritorio en modo desarrollo
npm run electron:dev

# Compilar para Windows
npm run electron:build
```

## 📦 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo Next.js
- `npm run build` - Compila la aplicación Next.js para producción
- `npm run start` - Inicia el servidor Next.js en producción
- `npm run lint` - Ejecuta el linter
- **`npm run electron:dev`** - Inicia la aplicación Electron en modo desarrollo
- **`npm run electron:build`** - Compila la aplicación Electron para Windows
- **`npm run electron:start`** - Inicia Electron con la última compilación

## 🔨 Compilación para Windows

Para crear un instalador de Windows:

```bash
npm run electron:build
```

Esto generará:
- Un instalador `.exe` en la carpeta `dist/`
- El instalador incluye todo lo necesario para ejecutar la aplicación
- Tamaño aproximado: **80-100 MB** (optimizado con puppeteer-core)

### Archivos Generados

```
dist/
├── AutoQA-Setup-0.1.0.exe    # Instalador NSIS
├── win-unpacked/              # Versión sin empaquetar (portable)
└── builder-effective-config.yaml
```

## 🛠️ Tecnologías

- **Next.js 16** - Framework React con SSR/SSG
- **Electron** - Framework para aplicaciones de escritorio
- **Puppeteer** - Automatización de navegador para testing
- **Axe-core** - Motor de accesibilidad
- **Tailwind CSS** - Framework de estilos
- **TypeScript** - Tipado estático

## 📋 Características

- ✅ Análisis de estructura SEO (headings, jerarquía)
- ✅ Testing de accesibilidad con Axe-core
- ✅ Detección de enlaces rotos
- ✅ Extracción automática de sitemap
- ✅ Interfaz moderna y responsive
- ✅ Análisis en batch de múltiples URLs
- ✅ Logs en tiempo real
- ✅ Disponible como web app y desktop app

## 🎯 Uso

1. **Ingresar dominio**: Escribe el dominio a analizar (ej: `mynaui.com`)
2. **Seleccionar URLs**: El sistema extrae el sitemap y muestra todas las URLs
3. **Analizar**: Selecciona las URLs que deseas analizar
4. **Revisar resultados**: Visualiza problemas de SEO, accesibilidad y enlaces rotos

## 🔧 Configuración

### Electron Builder

La configuración de compilación está en `electron-builder.json`. Puedes personalizar:

- Nombre de la aplicación
- Icono (coloca tu icono en `public/icon.ico`)
- Targets de compilación (Windows, macOS, Linux)
- Configuración del instalador NSIS

### Next.js

La configuración está en `next.config.ts`. En modo producción para Electron, se usa `output: 'export'` para generar archivos estáticos.

## 📝 Notas Técnicas

### Puppeteer en Electron

✅ **Optimizado**: La aplicación usa `puppeteer-core` que reutiliza el Chromium de Electron en lugar de descargar uno separado.

**Beneficios:**
- Reduce el tamaño del ejecutable en ~170MB
- Usa el mismo Chromium que Electron
- Más eficiente en memoria

**Modo Web**: Si ejecutas la app en modo web (sin Electron), necesitas tener Chrome instalado. El sistema buscará Chrome en las ubicaciones estándar o puedes especificar la ruta con la variable de entorno `CHROME_PATH`.

### Modo Desarrollo vs Producción

- **Desarrollo**: Electron inicia el servidor Next.js dev y se conecta a `localhost:3000`
- **Producción**: Next.js se compila a archivos estáticos en `/out` que Electron carga directamente

## 🐛 Troubleshooting

### La aplicación Electron no inicia

```bash
# Asegúrate de que las dependencias estén instaladas
npm install

# Verifica que el puerto 3000 esté libre
npm run electron:dev
```

### Error al compilar

```bash
# Limpia las carpetas de build
rm -rf .next out dist

# Vuelve a compilar
npm run electron:build
```

### Problemas con Puppeteer

Puppeteer requiere dependencias del sistema. En Windows generalmente funciona sin problemas, pero si hay errores, asegúrate de tener las últimas actualizaciones de Windows.

## 📄 Licencia

Este proyecto es privado.

## 🤝 Contribuir

Para contribuir al proyecto, contacta al equipo de ORBIDI.
