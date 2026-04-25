const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwTduAOnz43a-gNjchgq7LpKkC15V8u7O4CKxWkDz8qxTrR53eFIadzn5tLQ0Xoc938-g/exec',
  AUTH_USER: 'admin',
  AUTH_PASS: '70540303Aa'
};

const state = {
  ingresos: [],
  gastos: [],
  periodos: [],
  adelantos: [],
  prestamos: [],
  currentPeriodo: 'Periodo 1',
  charts: {}
};

const el = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n = 0) => `S/ ${Number(n || 0).toFixed(2)}`;

function showToast(msg) {
  const t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function setLoading(on) {
  const spinner = el('spinner');
  if (spinner) spinner.classList.toggle('hidden', !on);
}

function isOnline() {
  return navigator.onLine;
}

async function apiPost(payload, submitBtn = null) {
  if (!isOnline()) {
    showToast('Sin internet');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  setLoading(true);

  try {
    await fetch(CONFIG.API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });

    showToast('Guardado correctamente');
  } catch (err) {
    console.error(err);
    showToast('Error al guardar');
  } finally {
    setLoading(false);
    if (submitBtn) submitBtn.disabled = false;
  }
}

function apiGetSheet(hoja) {
  return new Promise((resolve) => {
    const callbackName = `jsonp_${hoja}_${Date.now()}`;

    window[callbackName] = function (response) {
      resolve(response.data || []);
      delete window[callbackName];
      script.remove();
    };

    const script = document.createElement('script');
    script.src = `${CONFIG.API_URL}?hoja=${encodeURIComponent(hoja)}&callback=${callbackName}`;
    script.onerror = () => {
      resolve([]);
      delete window[callbackName];
      script.remove();
    };

    document.body.appendChild(script);
  });
}

async function cargarDatos() {
  setLoading(true);

  try {
    const [ingresos, gastos, periodos, adelantos, prestamos] = await Promise.all([
      apiGetSheet('INGRESOS'),
      apiGetSheet('GASTOS'),
      apiGetSheet('PERIODOS'),
      apiGetSheet('ADELANTOS'),
      apiGetSheet('PRESTAMOS')
    ]);

    state.ingresos = ingresos;
    state.gastos = gastos;
    state.periodos = periodos;
    state.adelantos = adelantos;
    state.prestamos = prestamos;

    const activos = periodos.filter(p => String(p.estado || '').toLowerCase() === 'activo');
    const ultimoActivo = activos[activos.length - 1];

    state.currentPeriodo = ultimoActivo?.id_periodo || 'Periodo 1';

    renderDashboard();
    renderGraficos();
    renderTablas();
    renderTrabajadores();
    llenarSelectPeriodo();
  } finally {
    setLoading(false);
  }
}

function calcularTotales() {
  const p = state.currentPeriodo || 'Periodo 1';

  const ingresosP = state.ingresos.filter(i => String(i.periodo || 'Periodo 1') === p);
  const gastosP = state.gastos.filter(g => String(g.periodo || 'Periodo 1') === p);

  const totalIngresos = ingresosP.reduce((a, b) => a + Number(b.monto || 0), 0);
  const totalGastos = gastosP.reduce((a, b) => a + Number(b.monto || 0), 0);

  const hoy = todayISO();

  const ingresosHoy = state.ingresos
    .filter(i =>
      String(i.fecha || '').slice(0, 10) === hoy &&
      String(i.periodo || 'Periodo 1') === p
    )
    .reduce((a, b) => a + Number(b.monto || 0), 0);

  const gastosHoy = state.gastos
    .filter(g =>
      String(g.fecha || '').slice(0, 10) === hoy &&
      String(g.periodo || 'Periodo 1') === p
    )
    .reduce((a, b) => a + Number(b.monto || 0), 0);

  return {
    p,
    ingresosP,
    gastosP,
    totalIngresos,
    totalGastos,
    ganancia: totalIngresos - totalGastos,
    ingresosHoy,
    gastosHoy
  };
}

function renderDashboard() {
  const t = calcularTotales();

  if (el('periodInfo')) el('periodInfo').textContent = `Período activo: ${t.p}`;
  if (el('kpiIngresos')) el('kpiIngresos').textContent = money(t.totalIngresos);
  if (el('kpiGastos')) el('kpiGastos').textContent = money(t.totalGastos);
  if (el('kpiGanancia')) el('kpiGanancia').textContent = money(t.ganancia);
  if (el('kpiIngresosHoy')) el('kpiIngresosHoy').textContent = money(t.ingresosHoy);
  if (el('kpiGastosHoy')) el('kpiGastosHoy').textContent = money(t.gastosHoy);
}

function safeDestroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    state.charts[key] = null;
  }
}

function mapByDate(rows) {
  const map = {};
  rows.forEach(r => {
    const d = String(r.fecha || '').slice(0, 10) || todayISO();
    map[d] = (map[d] || 0) + Number(r.monto || 0);
  });
  return map;
}

function renderGraficos() {
  if (typeof Chart === 'undefined') return;

  const { ingresosP, gastosP } = calcularTotales();

  const gastosDia = mapByDate(gastosP);
  const labelsG = Object.keys(gastosDia).sort();

  safeDestroyChart('gastosDia');
  if (el('chartGastosDia')) {
    state.charts.gastosDia = new Chart(el('chartGastosDia'), {
      type: 'line',
      data: {
        labels: labelsG,
        datasets: [{
          label: 'Gastos',
          data: labelsG.map(l => gastosDia[l]),
          borderColor: '#c23d3d',
          tension: 0.3
        }]
      },
      options: { responsive: true }
    });
  }

  safeDestroyChart('ingresosGastos');
  if (el('chartIngresosGastos')) {
    state.charts.ingresosGastos = new Chart(el('chartIngresosGastos'), {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          data: [
            ingresosP.reduce((a, b) => a + Number(b.monto || 0), 0),
            gastosP.reduce((a, b) => a + Number(b.monto || 0), 0)
          ],
          backgroundColor: ['#1f8f5f', '#c23d3d']
        }]
      },
      options: { responsive: true }
    });
  }

  const cerrados = state.periodos.filter(p => String(p.estado || '').toLowerCase() !== 'activo');

  safeDestroyChart('periodos');
  if (el('chartPeriodos')) {
    state.charts.periodos = new Chart(el('chartPeriodos'), {
      type: 'line',
      data: {
        labels: cerrados.map(p => p.id_periodo),
        datasets: [{
          label: 'Ganancia',
          data: cerrados.map(p => Number(p.ganancia || 0)),
          borderColor: '#156647',
          tension: 0.25
        }]
      },
      options: { responsive: true }
    });
  }
}

function editableCell(value, field) {
  return `<input data-field="${field}" value="${String(value ?? '').replaceAll('"', '&quot;')}" />`;
}

function rowActions(type, id) {
  return `<button class="mini-btn btn-secondary" onclick="editarRegistro('${type}','${id}')">Editar</button>
          <button class="mini-btn btn-primary" onclick="guardarRegistro('${type}','${id}')">Guardar</button>
          <button class="mini-btn btn-danger" onclick="eliminarRegistro('${type}','${id}')">Eliminar</button>`;
}

function renderTablas() {
  const t = calcularTotales();

  if (el('tablaIngresos')) {
    el('tablaIngresos').innerHTML = t.ingresosP.map((r, i) => {
      const id = r.id || `ing-${i}`;
      return `<tr data-id="${id}">
        <td>${r.fecha || ''}</td>
        <td>${editableCell(r.descripcion, 'descripcion')}</td>
        <td>${editableCell(r.monto, 'monto')}</td>
        <td>${editableCell(r.metodo_pago || 'efectivo', 'metodo_pago')}</td>
        <td>${rowActions('INGRESOS', id)}</td>
      </tr>`;
    }).join('');
  }

  if (el('tablaGastos')) {
    el('tablaGastos').innerHTML = t.gastosP.map((r, i) => {
      const id = r.id || `gas-${i}`;
      return `<tr data-id="${id}">
        <td>${r.fecha || ''}</td>
        <td>${editableCell(r.descripcion, 'descripcion')}</td>
        <td>${editableCell(r.monto, 'monto')}</td>
        <td>${rowActions('GASTOS', id)}</td>
      </tr>`;
    }).join('');
  }

  if (el('tablaPeriodos')) {
    el('tablaPeriodos').innerHTML = state.periodos.map((p, i) => {
      const id = p.id_periodo || `Periodo ${i + 1}`;
      return `<tr data-id="${id}">
        <td>${id}</td>
        <td>${editableCell(p.fecha_inicio, 'fecha_inicio')}</td>
        <td>${editableCell(p.fecha_fin, 'fecha_fin')}</td>
        <td>${editableCell(p.total_ingresos || 0, 'total_ingresos')}</td>
        <td>${editableCell(p.total_gastos || 0, 'total_gastos')}</td>
        <td>${editableCell(p.ganancia || 0, 'ganancia')}</td>
        <td>${editableCell(p.estado || 'cerrado', 'estado')}</td>
        <td>${rowActions('PERIODOS', id)}</td>
      </tr>`;
    }).join('');
  }
}

function groupTotals(rows, key, filterFn = null) {
  const out = {};
  rows.filter(r => filterFn ? filterFn(r) : true).forEach(r => {
    const k = r[key] || 'Sin nombre';
    out[k] = (out[k] || 0) + Number(r.monto || 0);
  });
  return out;
}

function renderTrabajadores() {
  if (el('adelantosResumen')) {
    const adelantosBy = groupTotals(state.adelantos, 'trabajador');
    el('adelantosResumen').innerHTML =
      Object.entries(adelantosBy).map(([k, v]) => `<p><strong>${k}:</strong> ${money(v)}</p>`).join('') ||
      '<p class="muted">Sin datos.</p>';
  }

  if (el('prestamosResumen')) {
    const pendBy = groupTotals(state.prestamos, 'trabajador', r => String(r.estado || '').toLowerCase() !== 'pagado');
    el('prestamosResumen').innerHTML =
      Object.entries(pendBy).map(([k, v]) => `<p><strong>${k}:</strong> ${money(v)}</p>`).join('') ||
      '<p class="muted">Sin datos.</p>';
  }

  if (el('prestamosHistorial')) {
    el('prestamosHistorial').innerHTML = state.prestamos.map((p, i) => {
      const id = p.id || `pres-${i}`;
      const pagado = String(p.estado || '').toLowerCase() === 'pagado';

      return `<tr>
        <td>${p.fecha || ''}</td>
        <td>${p.trabajador || ''}</td>
        <td>${p.descripcion || ''}</td>
        <td>${money(p.monto)}</td>
        <td>${p.estado || 'pendiente'}</td>
        <td>${pagado ? '<span class="muted">Pagado</span>' : `<button class="mini-btn btn-primary" onclick="marcarPrestamoPagado('${id}')">Marcar pagado</button>`}</td>
      </tr>`;
    }).join('');
  }
}

function llenarSelectPeriodo() {
  const select = el('exportPeriodo');
  if (!select) return;

  select.innerHTML =
    `<option value="ALL">Todos</option>` +
    state.periodos.map(p => `<option value="${p.id_periodo}">${p.id_periodo}</option>`).join('');
}

async function cerrarPeriodo() {
  const t = calcularTotales();
  const ok = confirm(`Se cerrará ${t.p}. ¿Deseas continuar?`);
  if (!ok) return;

  await apiPost({
    hoja: 'PERIODOS',
    id_periodo: t.p,
    fecha_inicio: todayISO(),
    fecha_fin: todayISO(),
    total_ingresos: t.totalIngresos,
    total_gastos: t.totalGastos,
    ganancia: t.ganancia,
    estado: 'cerrado'
  });

  const numeros = state.periodos
    .map(p => Number(String(p.id_periodo || '').replace(/\D/g, '')))
    .filter(n => !isNaN(n));

  const ultimoNumero = numeros.length ? Math.max(...numeros) : 1;
  const nuevoPeriodo = `Periodo ${ultimoNumero + 1}`;

  await apiPost({
    hoja: 'PERIODOS',
    id_periodo: nuevoPeriodo,
    fecha_inicio: todayISO(),
    fecha_fin: '',
    total_ingresos: 0,
    total_gastos: 0,
    ganancia: 0,
    estado: 'activo'
  });

  state.currentPeriodo = nuevoPeriodo;
  showToast(`${t.p} cerrado. Nuevo: ${nuevoPeriodo}`);
  await cargarDatos();
}

function collectRowData(tr) {
  const out = {};
  tr.querySelectorAll('input[data-field]').forEach(inp => {
    out[inp.dataset.field] = inp.value;
  });
  return out;
}

window.editarRegistro = (tipo, id) => {
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  tr.querySelectorAll('input').forEach(i => i.disabled = false);
  showToast(`Editando ${tipo}`);
};

window.guardarRegistro = async (tipo, id) => {
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  const data = collectRowData(tr);
  await apiPost({ hoja: tipo, accion: 'update', id, ...data });
  showToast('Cambios enviados');
  await cargarDatos();
};

window.eliminarRegistro = async (tipo, id) => {
  if (!confirm('¿Eliminar registro?')) return;
  await apiPost({ hoja: tipo, accion: 'delete', id });
  showToast('Eliminación enviada');
  await cargarDatos();
};

window.marcarPrestamoPagado = async (id) => {
  await apiPost({ hoja: 'PRESTAMOS', accion: 'update', id, estado: 'pagado' });
  showToast('Préstamo marcado como pagado');
  await cargarDatos();
};

function dataByModule(module, periodo) {
  const pFilter = x => periodo === 'ALL' || !periodo || x.periodo === periodo || x.id_periodo === periodo;

  const map = {
    INGRESOS: state.ingresos.filter(pFilter),
    GASTOS: state.gastos.filter(pFilter),
    ADELANTOS: state.adelantos,
    PRESTAMOS: state.prestamos,
    PERIODOS: state.periodos
  };

  return map[module] || [];
}

function exportarCSV() {
  const type = el('exportType').value;
  const periodo = el('exportPeriodo').value;
  const rows = dataByModule(type, periodo);

  if (!rows.length) return showToast('No hay datos para exportar.');

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${type}_${periodo || 'ALL'}_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportarPDF() {
  const type = el('exportType').value;
  const periodo = el('exportPeriodo').value;
  const rows = dataByModule(type, periodo);

  if (!rows.length) return showToast('No hay datos para exportar.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`RECYTEC Reporte ${type}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Periodo: ${periodo} | Fecha: ${todayISO()}`, 14, 24);

  let y = 32;
  rows.slice(0, 40).forEach((r, i) => {
    doc.text(`${i + 1}. ${JSON.stringify(r).slice(0, 140)}`, 14, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  });

  doc.save(`${type}_${periodo || 'ALL'}_${todayISO()}.pdf`);
}

function abrirTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.toggle('active', tab.id === tabId);
  });
}

function initAuth() {
  const isAuth = localStorage.getItem('recytec_session') === 'ok' || localStorage.getItem('login') === 'ok';

  if (el('loginView')) el('loginView').classList.toggle('hidden', isAuth);
  if (el('appView')) el('appView').classList.toggle('hidden', !isAuth);
}

function bindForms() {
  if (el('loginForm')) {
    el('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();

      const user = el('username').value.trim();
      const pass = el('password').value;

      if (user === CONFIG.AUTH_USER && pass === CONFIG.AUTH_PASS) {
        localStorage.setItem('recytec_session', 'ok');
        localStorage.setItem('login', 'ok');
        initAuth();
        cargarDatos();
      } else {
        showToast('Credenciales inválidas.');
      }
    });
  }

  if (el('logoutBtn')) {
    el('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('recytec_session');
      localStorage.removeItem('login');
      initAuth();
    });
  }

  const bindSave = (formId, handler) => {
    if (!el(formId)) return;

    el(formId).addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = e.submitter;
      const data = Object.fromEntries(new FormData(e.target).entries());

      if (Number(data.monto) <= 0) return showToast('El monto debe ser mayor a 0');

      await handler(data, btn);
      e.target.reset();
      await cargarDatos();
    });
  };

  bindSave('gastoForm', async (data, btn) => apiPost({
    hoja: 'GASTOS',
    fecha: todayISO(),
    descripcion: data.descripcion,
    monto: Number(data.monto),
    periodo: state.currentPeriodo || 'Periodo 1'
  }, btn));

  bindSave('ingresoForm', async (data, btn) => apiPost({
    hoja: 'INGRESOS',
    fecha: todayISO(),
    descripcion: data.descripcion,
    monto: Number(data.monto),
    metodo_pago: data.metodo_pago || 'efectivo',
    periodo: state.currentPeriodo || 'Periodo 1'
  }, btn));

  bindSave('adelantoForm', async (data, btn) => apiPost({
    hoja: 'ADELANTOS',
    fecha: todayISO(),
    trabajador: data.trabajador,
    descripcion: data.descripcion,
    monto: Number(data.monto)
  }, btn));

  bindSave('prestamoForm', async (data, btn) => apiPost({
    hoja: 'PRESTAMOS',
    fecha: todayISO(),
    trabajador: data.trabajador,
    descripcion: data.descripcion,
    monto: Number(data.monto),
    estado: data.estado || 'pendiente'
  }, btn));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => abrirTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-go-tab]').forEach(btn => {
    btn.addEventListener('click', () => abrirTab(btn.dataset.goTab));
  });

  if (el('cerrarPeriodoBtn')) el('cerrarPeriodoBtn').addEventListener('click', cerrarPeriodo);
  if (el('btnExportCsv')) el('btnExportCsv').addEventListener('click', exportarCSV);
  if (el('btnExportPdf')) el('btnExportPdf').addEventListener('click', exportarPDF);
}

window.addEventListener('online', () => showToast('Conexión restaurada.'));
window.addEventListener('offline', () => showToast('Sin internet.'));

document.addEventListener('DOMContentLoaded', async () => {
  bindForms();
  initAuth();

  if (localStorage.getItem('recytec_session') === 'ok' || localStorage.getItem('login') === 'ok') {
    await cargarDatos();
  }
});
