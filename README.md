# RECYTEC - Dashboard Administrativo Web

Sistema administrativo profesional para chatarrería RECYTEC, construido con **HTML + CSS + JavaScript puro**, compatible con **GitHub Pages**, orientado a móvil y laptop.

## ✅ Funcionalidades incluidas

- Login con sesión persistente (localStorage).
- Dashboard con KPIs:
  - Ingresos período
  - Gastos período
  - Ganancia
  - Ingresos de hoy
  - Gastos de hoy
- Registro independiente de:
  - Ingresos
  - Gastos
  - Adelantos
  - Préstamos
- Módulo de trabajadores separado de finanzas generales.
- Gestión de períodos:
  - Período activo
  - Cierre de período
  - Creación automática de nuevo período
- Historial con tablas separadas y acciones:
  - Editar
  - Guardar
  - Eliminar
- Gráficos con Chart.js:
  - Gastos por día
  - Ingresos vs gastos
  - Evolución de períodos cerrados
- Exportación:
  - CSV (compatible con Excel)
  - PDF imprimible
- Módulo independiente **Boletas HOiN / POS-58** (`boletas.html`).

## 📁 Estructura

- `index.html` - App principal (dashboard)
- `styles.css` - Diseño responsive profesional RECYTEC
- `app.js` - Lógica completa de frontend
- `boletas.html` - Generador/impressor de boletas térmicas 58mm
- `README.md`

## 🔐 Acceso

Por defecto:

- Usuario: `admin`
- Contraseña: `70540303Aa`

### Cambiar usuario/contraseña
Editar en `app.js`:

```js
const CONFIG = {
  AUTH_USER: 'admin',
  AUTH_PASS: '70540303Aa'
}
```

## 🔌 API Google Sheets

API actual configurada:

```txt
https://script.google.com/macros/s/AKfycbwTduAOnz43a-gNjchgq7LpKkC15V8u7O4CKxWkDz8qxTrR53eFIadzn5tLQ0Xoc938-g/exec
```

### Cambiar URL de Apps Script
Editar en `app.js` la propiedad `API_URL` dentro de `CONFIG`.

## 🧾 Hojas requeridas en Google Sheets

Debes crear estas hojas exactamente con estos nombres:

1. `GASTOS`
2. `INGRESOS`
3. `PERIODOS`
4. `ADELANTOS`
5. `PRESTAMOS`

Columnas sugeridas:

- GASTOS: `id, fecha, descripcion, monto, periodo`
- INGRESOS: `id, fecha, descripcion, monto, metodo_pago, periodo`
- PERIODOS: `id_periodo, fecha_inicio, fecha_fin, total_ingresos, total_gastos, ganancia, estado`
- ADELANTOS: `id, fecha, trabajador, descripcion, monto`
- PRESTAMOS: `id, fecha, trabajador, descripcion, monto, estado`

## ✍️ Contratos JSON usados en POST

### GASTOS
```json
{
  "hoja": "GASTOS",
  "descripcion": "Compra combustible",
  "monto": 100,
  "periodo": "Periodo 1"
}
```

### INGRESOS
```json
{
  "hoja": "INGRESOS",
  "descripcion": "Venta de cobre",
  "monto": 3000,
  "metodo_pago": "Yape",
  "periodo": "Periodo 1"
}
```

### ADELANTOS
```json
{
  "hoja": "ADELANTOS",
  "trabajador": "Juan",
  "descripcion": "Adelanto semanal",
  "monto": 100
}
```

### PRESTAMOS
```json
{
  "hoja": "PRESTAMOS",
  "trabajador": "Luis",
  "descripcion": "Préstamo de emergencia",
  "monto": 200,
  "estado": "pendiente"
}
```

## ♻️ Update/Delete de registros

El frontend ya está preparado para enviar:

- Update: `{ hoja, accion: "update", id, ...campos }`
- Delete: `{ hoja, accion: "delete", id }`

Si tu Apps Script aún no soporta estas acciones, debes agregar handlers de `accion` para actualizar/eliminar por `id` en cada hoja.

## 🧾 Módulo HOiN

El archivo `boletas.html` es independiente del dashboard:

- No suma ingresos ni gastos.
- Diseñado para papel térmico **58mm**.
- Botón para imprimir directo.
- Botón para volver al dashboard.

Cuando me envíes tu HTML térmico final, puedes reemplazar solo el bloque del ticket y mantener la navegación.

## 🚀 Publicar en GitHub Pages

1. Sube estos archivos al repositorio.
2. Ve a **Settings → Pages**.
3. En **Source**, elige la rama (ej. `main`) y carpeta `/root`.
4. Guarda y espera el enlace público.

## 🛡️ Manejo de errores implementado

- Mensajes cuando no hay internet.
- Spinner de carga global.
- Bloqueo de botón durante envío para evitar doble clic.
- Validación de monto > 0.
- Confirmación antes de eliminar.
- Logs simples en consola.

## 📌 Nota sobre CORS y lectura GET

El dashboard intenta leer datos por `GET ?hoja=...`. Si tu Apps Script no devuelve datos por GET, debes habilitar también ese flujo o devolver un objeto con `data`/`rows`.
