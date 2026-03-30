const state = {
  items: []
};

const clientInput = document.getElementById('client');
const vehicleInput = document.getElementById('vehicle');
const budgetNumberInput = document.getElementById('budgetNumber');
const budgetNumberBadge = document.getElementById('budgetNumberBadge');
const issueDateInput = document.getElementById('issueDate');
const observationsInput = document.getElementById('observations');
const itemsList = document.getElementById('itemsList');
const grandTotalEl = document.getElementById('grandTotal');
const itemTemplate = document.getElementById('itemTemplate');

function pad(value) {
  return String(value).padStart(2, '0');
}

function generateBudgetNumber(date = new Date()) {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `100-${dd}${mm}${yyyy}${hh}${min}`;
}

function formatDate(date = new Date()) {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatCurrency(value) {
  const safe = Number(value) || 0;
  return `$ ${safe.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function sanitizeText(value, fallback) {
  const clean = String(value || '').trim();
  return clean || fallback;
}

function lineTotal(item) {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const price = Math.max(0, Number(item.price) || 0);
  return qty * price;
}

function createItem() {
  state.items.push({
    quantity: 1,
    description: '',
    price: 0
  });
  renderItems();
}

function removeItem(index) {
  state.items.splice(index, 1);
  if (state.items.length === 0) {
    state.items = [{ quantity: 1, description: '', price: 0 }];
  }
  renderItems();
}

function updateTotals() {
  const total = state.items.reduce((acc, item) => acc + lineTotal(item), 0);
  grandTotalEl.textContent = formatCurrency(total);
}

function renderItems() {
  itemsList.innerHTML = '';

  state.items.forEach((item, index) => {
    const fragment = itemTemplate.content.cloneNode(true);
    const article = fragment.querySelector('.item-card');
    const codeEl = fragment.querySelector('.item-code');
    const qtyInput = fragment.querySelector('.item-qty');
    const descriptionInput = fragment.querySelector('.item-description');
    const priceInput = fragment.querySelector('.item-price');
    const totalEl = fragment.querySelector('.item-total');
    const deleteBtn = fragment.querySelector('.btn-delete');

    const code = 100 + index;
    codeEl.textContent = code;
    qtyInput.value = Math.max(1, Number(item.quantity) || 1);
    descriptionInput.value = item.description;
    priceInput.value = item.price ? Math.round(item.price) : '';
    totalEl.textContent = formatCurrency(lineTotal(item));

    qtyInput.addEventListener('input', () => {
      state.items[index].quantity = Math.max(1, parseInt(qtyInput.value || '1', 10));
      totalEl.textContent = formatCurrency(lineTotal(state.items[index]));
      updateTotals();
    });

    qtyInput.addEventListener('blur', () => {
      if (!qtyInput.value || Number(qtyInput.value) < 1) {
        state.items[index].quantity = 1;
        qtyInput.value = 1;
        totalEl.textContent = formatCurrency(lineTotal(state.items[index]));
        updateTotals();
      }
    });

    descriptionInput.addEventListener('input', () => {
      state.items[index].description = descriptionInput.value;
    });

    priceInput.addEventListener('input', () => {
      const raw = parseInt(priceInput.value || '0', 10);
      state.items[index].price = Math.max(0, raw || 0);
      totalEl.textContent = formatCurrency(lineTotal(state.items[index]));
      updateTotals();
    });

    priceInput.addEventListener('blur', () => {
      if (!priceInput.value) {
        state.items[index].price = 0;
        totalEl.textContent = formatCurrency(lineTotal(state.items[index]));
        updateTotals();
      }
    });

    deleteBtn.addEventListener('click', () => removeItem(index));
    itemsList.appendChild(article);
  });

  updateTotals();
}

function resetBudget() {
  const now = new Date();
  const number = generateBudgetNumber(now);
  const date = formatDate(now);

  clientInput.value = '';
  vehicleInput.value = '';
  observationsInput.value = '';
  budgetNumberInput.value = number;
  budgetNumberBadge.textContent = number;
  issueDateInput.value = date;

  state.items = [{ quantity: 1, description: '', price: 0 }];
  renderItems();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fillPdfTemplate() {
  document.getElementById('pdfBudgetNumber').textContent = budgetNumberInput.value;
  document.getElementById('pdfIssueDate').textContent = issueDateInput.value;
  document.getElementById('pdfClient').textContent = sanitizeText(clientInput.value, 'Consumidor Final');
  document.getElementById('pdfVehicle').textContent = sanitizeText(vehicleInput.value, 'No especifica');

  const body = document.getElementById('pdfItemsBody');
  body.innerHTML = '';

  let total = 0;

  state.items.forEach((item, index) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.price) || 0);
    const itemTotal = qty * price;
    total += itemTotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${100 + index}</td>
      <td>${qty}</td>
      <td>${sanitizeText(item.description, 'N/D')}</td>
      <td>${formatCurrency(price)}</td>
      <td>${formatCurrency(itemTotal)}</td>
    `;
    body.appendChild(row);
  });

  document.getElementById('pdfGrandTotal').textContent = formatCurrency(total);
  document.getElementById('pdfObservations').textContent = sanitizeText(
    observationsInput.value,
    'Sin observaciones.'
  );
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function generatePdf() {
  fillPdfTemplate();

  const pdfPage = document.querySelector('#pdfTemplate .pdf-page');
  await waitForImages(pdfPage);

  const clientName = sanitizeText(clientInput.value, 'Consumidor Final')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s_-]/g, '')
    .replace(/\s+/g, '_');

  const filename = `Presupuesto_${budgetNumberInput.value}_${clientName}.pdf`;

  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    await html2pdf().set(opt).from(pdfPage).save();
  } catch (error) {
    console.error(error);
    alert('No se pudo generar el PDF. Probá nuevamente.');
  }
}

document.getElementById('addItemBtn').addEventListener('click', createItem);
document.getElementById('newBudgetBtn').addEventListener('click', resetBudget);
document.getElementById('generatePdfBtn').addEventListener('click', generatePdf);

resetBudget();
