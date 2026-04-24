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
  currentPeriodo: null
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

//////////////////////////////////////////////////
// 🔥 FIX REAL AQUÍ (CORS SOLUCIONADO)
//////////////////////////////////////////////////

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

//////////////////////////////////////////////////

function calcularTotales() {
  const p = state.currentPeriodo || 'Periodo 1';

  const ingresos = state.ingresos.filter(i => i.periodo === p);
  const gastos = state.gastos.filter(g => g.periodo === p);

  const totalIngresos = ingresos.reduce((a, b) => a + Number(b.monto || 0), 0);
  const totalGastos = gastos.reduce((a, b) => a + Number(b.monto || 0), 0);

  return {
    ingresos: totalIngresos,
    gastos: totalGastos,
    ganancia: totalIngresos - totalGastos
  };
}

function renderDashboard() {
  const t = calcularTotales();
  el('kpiIngresos').textContent = money(t.ingresos);
  el('kpiGastos').textContent = money(t.gastos);
  el('kpiGanancia').textContent = money(t.ganancia);
}

//////////////////////////////////////////////////
// 🔐 LOGIN
//////////////////////////////////////////////////

function initAuth() {
  const ok = localStorage.getItem('login') === 'ok';

  el('loginView').classList.toggle('hidden', ok);
  el('appView').classList.toggle('hidden', !ok);
}

function bindLogin() {
  el('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const user = el('username').value;
    const pass = el('password').value;

    if (user === CONFIG.AUTH_USER && pass === CONFIG.AUTH_PASS) {
      localStorage.setItem('login', 'ok');
      initAuth();
    } else {
      showToast('Credenciales incorrectas');
    }
  });

  el('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('login');
    initAuth();
  });
}

//////////////////////////////////////////////////
// 📥 FORMULARIOS
//////////////////////////////////////////////////

function bindForms() {

  el('ingresoForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.target).entries());

    await apiPost({
      hoja: 'INGRESOS',
      descripcion: data.descripcion,
      monto: Number(data.monto),
      metodo_pago: data.metodo_pago,
      periodo: 'Periodo 1'
    });

    e.target.reset();
  });

  el('gastoForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.target).entries());

    await apiPost({
      hoja: 'GASTOS',
      descripcion: data.descripcion,
      monto: Number(data.monto),
      periodo: 'Periodo 1'
    });

    e.target.reset();
  });

}

//////////////////////////////////////////////////
// 🚀 INIT
//////////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', () => {
  bindLogin();
  bindForms();
  initAuth();
});
