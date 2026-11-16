# DiceTech · v1.0 (prototipo)

Lanzador de dados 3D para juegos de rol, by PenTech.

## Publicar en GitHub Pages
1. Crea un repositorio (por ejemplo `DiceTech`) y sube **todo** el contenido de esta carpeta, con las subcarpetas `lib/` y `fonts/`.
2. Activa GitHub Pages (Settings → Pages → rama `main`, carpeta raíz).
3. Abre `https://pentech-26.github.io/DiceTech/` y, en el iPhone, «Añadir a pantalla de inicio».

Ojo: no funciona abriendo `index.html` con doble clic; tiene que servirse por https (GitHub Pages).

## Publicar un cambio
- Sustituir los archivos modificados y subir siempre `CACHE` en `sw.js` (`dicetech-v6` → `dicetech-v7`…).
- No tocar `VERSION` (se queda en `v1.0`).

## Archivos
- `index.html` (pantalla y estilos), `app.js` (interfaz, 3D, idiomas), `fisica.js` (física de la bandeja), `dados.js` (geometría de los dados), `textos.js` (los 6 idiomas)
- `lib/` three.js 0.187 y cannon-es 0.20 (licencia MIT), `fonts/` Cinzel e IM Fell English SC (OFL)
- `sw.js`, `manifest.json`, iconos (provisionales)
