import { loadHistory } from "./datos.js";

const $ = id => document.getElementById(id);
const form = $("booking");
const inputs = form.elements;
const formatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const labelPartition = { prueba: "Prueba", validacion: "Validación" };
const pageSize = 10;
const schema = {
  stay: [["hotel", "Hotel"], ["arrival", "Llegada", "date"], ["lead_time", "Antelación (días)", "number"], ["total_nights", "Noches", "number"]],
  guests: [["adults", "Adultos", "number"], ["children", "Niños", "number"], ["babies", "Bebés", "number"]],
  commercial: [["meal", "Régimen"], ["market_segment", "Segmento"], ["distribution_channel", "Canal"], ["reserved_room_type", "Habitación reservada"], ["customer_type", "Tipo de cliente"]],
};
const translations = {
  meal: { BB: "Desayuno · BB", HB: "Media pensión · HB", FB: "Pensión completa · FB", SC: "Sin comidas · SC", Undefined: "Sin definir" },
  market_segment: { Groups: "Grupos", Direct: "Directo", "Online TA": "Agencia en línea", "Offline TA/TO": "Agencia / turoperador", Undefined: "Sin definir" },
  distribution_channel: { "TA/TO": "Agencia · TA/TO", Direct: "Directo", Undefined: "Sin definir" },
};
let history;
let page = 0;
let activeRoute;

function route(focus = false) {
  const requested = location.hash.slice(1);
  if (requested === "contenido") return;
  const next = ["inicio", "evaluacion", "historico"].includes(requested) ? requested : "inicio";
  for (const link of document.querySelectorAll("[data-route]")) {
    const selected = link.dataset.route === next;
    $(link.dataset.route).hidden = !selected;
    if (selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (focus && next !== activeRoute) $(next).querySelector("h1").focus();
  activeRoute = next;
}

function addOptions(select, options, labels = {}) {
  for (const value of options) select.add(new Option(labels[value] ?? value, value));
}

function initializeFields(categories) {
  for (const [group, fields] of Object.entries(schema)) {
    for (const [name, label, type] of fields) {
      const wrapper = document.createElement("div");
      const caption = document.createElement("label");
      caption.textContent = label;
      const input = document.createElement(type ? "input" : "select");
      input.name = name;
      input.required = true;
      if (type) input.type = type;
      if (type === "number") {
        input.min = "0";
        input.step = "1";
        input.inputMode = "numeric";
      }
      if (!type) {
        input.add(new Option("Seleccionar", ""));
        addOptions(input, categories[name], translations[name]);
      }
      const error = document.createElement("span");
      error.className = "error";
      error.id = "error-" + name;
      input.setAttribute("aria-describedby", error.id);
      caption.append(input);
      wrapper.append(caption, error);
      $(group).append(wrapper);
    }
  }
}

function clearError(input) {
  input.removeAttribute("aria-invalid");
  const error = $("error-" + input.name);
  if (error) error.textContent = "";
}

function updateChildren() {
  inputs.children.disabled = inputs.children_missing.checked;
  if (inputs.children.disabled) clearError(inputs.children);
}

function clearResult(message = "Selecciona una reserva del histórico para ver la estimación guardada.") {
  $("no-result").hidden = false;
  $("result-data").hidden = true;
  $("result-source").textContent = "Sin resultado";
  $("result-message").textContent = message;
  $("result-live").textContent = message;
}

function showResult(record) {
  const score = formatter.format(record.score * 100) + " %";
  const priority = record.priority ? "Prioridad alta" : "Fuera del cupo";
  $("result-source").textContent = "Reserva " + record.id;
  $("score").textContent = score;
  $("score-bar").value = record.score;
  $("priority").textContent = priority;
  $("priority-box").classList.toggle("outside", !record.priority);
  $("rank").textContent = "Posición " + integer.format(record.rank) + " de " + integer.format(record.size) + " · Cupo del 20 %";
  $("batch").textContent = labelPartition[record.partition] + " · " + record.month + " · Ambos hoteles";
  const actions = record.priority
    ? ["Revisar los plazos y las condiciones de cancelación.", "Valorar una confirmación manual con el equipo de Reservas."]
    : ["Mantener el seguimiento habitual.", "Revisar casos con incidencias según el criterio del equipo."];
  $("recommendations").replaceChildren(...actions.map(text => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  $("no-result").hidden = true;
  $("result-data").hidden = false;
  $("result-live").textContent = "Reserva " + record.id + ". Estimación sin calibrar " + score + ". " + priority + ".";
}

function selectRecord(record) {
  for (const name of history.features) {
    if (name === "arrival_date_month") continue;
    if (name === "children_missing") inputs[name].checked = Boolean(record[name]);
    else inputs[name].value = record[name] ?? "";
  }
  inputs.arrival.value = record.arrival;
  updateChildren();
  for (const input of form.querySelectorAll("[aria-invalid]")) clearError(input);
  $("validation-status").textContent = "";
  showResult(record);
  location.hash = "evaluacion";
}

function validate() {
  const fields = Object.values(schema).flat();
  let firstError;
  for (const [name, , type] of fields) {
    const input = inputs[name];
    clearError(input);
    if (input.disabled) continue;
    let message = "";
    if (input.validity.badInput || (type === "number" && input.value && (!input.validity.valid || !Number.isSafeInteger(Number(input.value))))) {
      message = "Introduce un entero no negativo.";
    } else if (!input.value || !input.validity.valid) {
      message = type === "date" ? "Introduce una fecha válida." : "Completa este campo.";
    }
    if (message) {
      input.setAttribute("aria-invalid", "true");
      $("error-" + name).textContent = message;
      firstError ??= input;
    }
  }
  if (firstError) {
    $("validation-status").textContent = "Corrige los campos indicados.";
    firstError.focus();
    return;
  }
  const zero = Number(inputs.total_nights.value) === 0 ||
    (!inputs.children_missing.checked && ["adults", "children", "babies"].every(name => Number(inputs[name].value) === 0));
  $("validation-status").textContent = zero
    ? "Datos válidos. Comprueba si es correcto que haya cero noches o huéspedes. El modelo sigue sin conectar."
    : "Datos válidos. El modelo sigue sin conectar.";
}

function filteredRecords() {
  const search = $("search").value.trim();
  const hotel = $("hotel-filter").value;
  const partition = $("partition").value;
  const month = $("month").value;
  const priority = $("priority-filter").value;
  return history.records.filter(record =>
    (!search || String(record.id).includes(search)) &&
    (!hotel || record.hotel === hotel) &&
    (!partition || record.partition === partition) &&
    (!month || record.month === month) &&
    (!priority || record.priority === (priority === "high"))
  );
}

function historyRow(record) {
  const row = document.createElement("tr");
  const date = record.arrival.split("-").reverse().join("/");
  const values = [record.id, record.hotel, date, labelPartition[record.partition], formatter.format(record.score * 100) + " %"];
  for (const value of values) row.insertCell().textContent = value;
  const pill = document.createElement("span");
  pill.className = "pill " + (record.priority ? "high" : "neutral");
  pill.textContent = record.priority ? "Prioridad alta" : "Fuera del cupo";
  row.insertCell().append(pill);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Abrir";
  button.setAttribute("aria-label", "Abrir reserva " + record.id);
  button.addEventListener("click", () => selectRecord(record));
  row.insertCell().append(button);
  return row;
}

function renderHistory() {
  const results = filteredRecords();
  const pages = Math.ceil(results.length / pageSize);
  const offset = page * pageSize;
  $("history-rows").replaceChildren(...results.slice(offset, offset + pageSize).map(historyRow));
  $("history-status").textContent = results.length
    ? integer.format(results.length) + (results.length === 1 ? " reserva" : " reservas")
    : "No hay reservas que coincidan con los filtros.";
  $("pager").hidden = pages <= 1;
  $("page-info").textContent = "Página " + (page + 1) + " de " + integer.format(pages);
  $("previous").disabled = page === 0;
  $("next").disabled = page >= pages - 1;
}

async function start() {
  $("load-notice").hidden = false;
  $("retry").hidden = true;
  $("load-status").textContent = "Cargando reservas y catálogos…";
  try {
    history = await loadHistory();
  } catch {
    $("load-status").textContent = "No se pudo abrir el histórico. Comprueba que el servidor local está activo y vuelve a intentarlo.";
    $("retry").hidden = false;
    return;
  }
  initializeFields(history.categories);
  addOptions($("hotel-filter"), history.categories.hotel);
  addOptions($("month"), [...new Set(history.records.map(record => record.month))].sort().reverse());
  $("total").textContent = integer.format(history.records.length);
  $("test-total").textContent = integer.format(history.records.filter(record => record.partition === "prueba").length);
  $("validation-total").textContent = integer.format(history.records.filter(record => record.partition === "validacion").length);
  $("booking-fields").disabled = false;
  $("history-filters").disabled = false;
  $("load-notice").hidden = true;
  renderHistory();
}

window.addEventListener("hashchange", () => route(true));
form.addEventListener("submit", event => {
  event.preventDefault();
  validate();
});
form.addEventListener("input", event => {
  clearError(event.target);
  updateChildren();
  $("validation-status").textContent = "";
  if (!$("result-data").hidden) clearResult("Has editado la reserva. Vuelve a cargar la ficha histórica para ver la estimación guardada.");
});
$("clear").addEventListener("click", () => {
  form.reset();
  updateChildren();
  for (const input of form.querySelectorAll("[aria-invalid]")) clearError(input);
  $("validation-status").textContent = "";
  clearResult();
  inputs.hotel.focus();
});
$("history-filters").addEventListener("input", () => {
  page = 0;
  renderHistory();
});
$("previous").addEventListener("click", () => { page -= 1; renderHistory(); });
$("next").addEventListener("click", () => { page += 1; renderHistory(); });
$("retry").addEventListener("click", start);
route();
start();
