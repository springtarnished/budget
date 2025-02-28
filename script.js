const PAYCHECK_AMOUNT = 620;
const RESERVE = 50;
const bills = [
  { name: 'Rent', due: 800, dueDate: '1st' },
  { name: 'Spotify', due: 13, dueDate: '5th' },
  { name: 'Affirm', due: 50, dueDate: '6th' },
  { name: 'Verizon', due: 150, dueDate: '6th' },
  { name: 'Firestone', due: 45, dueDate: '8th' },
  { name: 'Just Insure', due: 60, dueDate: '10th' },
  { name: 'Paypal', due: 60, dueDate: '10th' },
  { name: 'Discover', due: 48, dueDate: '13th' },
  { name: 'Capital One', due: 60, dueDate: '14th' },
  { name: 'Barclay', due: 30, dueDate: '14th' },
  { name: 'Credit One', due: 30, dueDate: '17th' },
  { name: 'Car', due: 397, dueDate: '18th' },
  { name: 'Apple Card', due: 30, dueDate: '30th' }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // Get current month
let paychecks = [];
let totalMonthlyBills = bills.reduce((sum, bill) => sum + bill.due, 0);

// Store custom paycheck amounts
let customPaycheckAmounts = {};

// Generate bill categories with color codes - Midcentury Modern palette
const CATEGORIES = {
  'Housing': { color: '#264653', icon: 'home' },
  'Transportation': { color: '#e9c46a', icon: 'car' },
  'Utilities': { color: '#e76f51', icon: 'bolt' },
  'Entertainment': { color: '#2a9d8f', icon: 'music' },
  'Subscriptions': { color: '#f4a261', icon: 'rss' },
  'Insurance': { color: '#118ab2', icon: 'shield' },
  'Credit': { color: '#774936', icon: 'credit-card' },
  'Other': { color: '#6b705c', icon: 'ellipsis-h' }
};

// Assign categories to bills
const categorizedBills = bills.map(bill => {
  let category = 'Other';

  if (bill.name.toLowerCase().includes('rent')) category = 'Housing';
  else if (bill.name.toLowerCase().includes('car') || bill.name.toLowerCase().includes('firestone')) category = 'Transportation';
  else if (bill.name.toLowerCase().includes('verizon')) category = 'Utilities';
  else if (bill.name.toLowerCase().includes('spotify')) category = 'Entertainment';
  else if (bill.name.toLowerCase().includes('just insure')) category = 'Insurance';
  else if (bill.name.toLowerCase().includes('discover') || 
          bill.name.toLowerCase().includes('capital one') || 
          bill.name.toLowerCase().includes('barclay') || 
          bill.name.toLowerCase().includes('credit one') || 
          bill.name.toLowerCase().includes('apple card') || 
          bill.name.toLowerCase().includes('affirm') ||
          bill.name.toLowerCase().includes('paypal')) category = 'Credit';

  return { 
    ...bill, 
    category, 
    color: CATEGORIES[category].color,
    icon: CATEGORIES[category].icon
  };
});

function buildPaychecks(year, month) {
  const paychecks = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 5) { // Friday
      const paycheckKey = `${year}-${month}-${day}`;
      const customAmount = customPaycheckAmounts[paycheckKey] || PAYCHECK_AMOUNT;

      paychecks.push({
        date: d,
        formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        allocated: 0,
        bills: [],
        id: paycheckKey,
        amount: customAmount
      });
    }
  }

  // Ensure we have at least one paycheck for the month
  if (!paychecks.length) {
    const fallback = new Date(year, month, daysInMonth);
    const paycheckKey = `${year}-${month}-${daysInMonth}`;
    const customAmount = customPaycheckAmounts[paycheckKey] || PAYCHECK_AMOUNT;

    paychecks.push({
      date: fallback,
      formattedDate: fallback.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      allocated: 0,
      bills: [],
      id: paycheckKey,
      amount: customAmount
    });
  }

  return paychecks;
}

function available(p) {
  return p.amount - RESERVE - p.allocated;
}

function allocateNonRentBills(paychecks) {
  const nonRentBills = categorizedBills
    .filter(b => b.name.toLowerCase() !== 'rent')
    .sort((a, b) => {
      // Convert dueDate strings to numeric values for comparison
      const aDueDay = parseInt(a.dueDate, 10) || 1;
      const bDueDay = parseInt(b.dueDate, 10) || 1;
      return aDueDay - bDueDay;
    });

  nonRentBills.forEach(bill => {
    let remaining = bill.due;
    const billDue = parseInt(bill.dueDate, 10) || 1; // Default to 1st if parsing fails

    while (remaining > 0) {
      let pool = paychecks.length > 1 ? paychecks.slice(0, paychecks.length - 1) : paychecks;
      let eligible = pool.filter(p => p.date.getDate() <= billDue);

      if (eligible.length === 0) eligible = pool;
      eligible = eligible.filter(p => available(p) > 0);

      if (eligible.length === 0) break; // No eligible paychecks with available funds

      // Select the paycheck closest to due date
      let candidate = eligible.reduce((a, b) => (a.date.getDate() > b.date.getDate() ? a : b));
      let avail = available(candidate);
      const alloc = Math.min(avail, remaining);

      candidate.bills.push({
        name: bill.name,
        due: alloc,
        dueDate: bill.dueDate,
        warning: candidate.date.getDate() > billDue,
        category: bill.category,
        color: bill.color,
        icon: bill.icon
      });

      candidate.allocated += alloc;
      remaining -= alloc;
    }
  });
}

function allocateRentBills(paychecks) {
  const rentBill = categorizedBills.find(b => b.name.toLowerCase() === 'rent');

  if (rentBill) {
    const billDue = parseInt(rentBill.dueDate, 10) || 1; // Default to 1st if parsing fails

    if (paychecks.length > 1) {
      // Split rent between first and last paycheck
      const firstPaycheck = paychecks[0];
      const lastPaycheck = paychecks[paychecks.length - 1];
      const firstHalf = Math.floor(rentBill.due / 2);
      const secondHalf = rentBill.due - firstHalf;

      let availFirst = available(firstPaycheck);
      let allocFirst = Math.min(availFirst, firstHalf);

      if (allocFirst > 0) {
        firstPaycheck.bills.push({
          name: rentBill.name,
          due: allocFirst,
          dueDate: rentBill.dueDate,
          warning: firstPaycheck.date.getDate() > billDue,
          category: rentBill.category,
          color: rentBill.color,
          icon: rentBill.icon
        });

        firstPaycheck.allocated += allocFirst;
      }

      let availLast = available(lastPaycheck);
      let allocLast = Math.min(availLast, secondHalf + (firstHalf - allocFirst)); // Add any unallocated amount from first half

      if (allocLast > 0) {
        lastPaycheck.bills.push({
          name: rentBill.name,
          due: allocLast,
          dueDate: rentBill.dueDate,
          warning: lastPaycheck.date.getDate() > billDue,
          category: rentBill.category,
          color: rentBill.color,
          icon: rentBill.icon
        });

        lastPaycheck.allocated += allocLast;
      }
    } else {
      // Only one paycheck available, allocate as much as possible
      const paycheck = paychecks[0];
      let avail = available(paycheck);
      let alloc = Math.min(avail, rentBill.due);

      if (alloc > 0) {
        paycheck.bills.push({
          name: rentBill.name,
          due: alloc,
          dueDate: rentBill.dueDate,
          warning: paycheck.date.getDate() > billDue,
          category: rentBill.category,
          color: rentBill.color,
          icon: rentBill.icon
        });

        paycheck.allocated += alloc;
      }
    }
  }
}

function allocateBillsForMonth(year, month) {
  const paychecks = buildPaychecks(year, month);
  allocateNonRentBills(paychecks);
  allocateRentBills(paychecks);
  return paychecks;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function calculateCategorySpending() {
  const categoryTotals = {};

  Object.keys(CATEGORIES).forEach(category => {
    categoryTotals[category] = 0;
  });

  categorizedBills.forEach(bill => {
    categoryTotals[bill.category] += bill.due;
  });

  return categoryTotals;
}

function renderCategoryChart(categories) {
  const chartContainer = document.getElementById('category-chart');
  if (!chartContainer) return; // Safety check

  chartContainer.innerHTML = '';

  const pieContainer = document.createElement('div');
  pieContainer.className = 'pie-container';

  let startAngle = 0;
  const chartLegend = document.createElement('div');
  chartLegend.className = 'chart-legend';

  // Calculate total for percentages
  const total = Object.values(categories).reduce((sum, value) => sum + value, 0);

  // Create chart segments
  Object.entries(categories).forEach(([category, amount]) => {
    if (amount === 0) return;

    const percentage = amount / total;
    const endAngle = startAngle + percentage * 360;

    // Create pie segment
    const segment = document.createElement('div');
    segment.className = 'pie-segment';
    segment.style.background = `conic-gradient(transparent ${startAngle}deg, ${CATEGORIES[category].color} ${startAngle}deg, ${CATEGORIES[category].color} ${endAngle}deg, transparent ${endAngle}deg)`;
    pieContainer.appendChild(segment);

    // Add to legend
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${CATEGORIES[category].color}"></span>
      <span class="legend-name">${category}</span>
      <span class="legend-amount">${formatCurrency(amount)}</span>
      <span class="legend-percent">${Math.round(percentage * 100)}%</span>
    `;
    chartLegend.appendChild(legendItem);

    startAngle = endAngle;
  });

  chartContainer.appendChild(pieContainer);
  chartContainer.appendChild(chartLegend);
}

function renderPaycheckProgress() {
  const progressEl = document.getElementById('paycheck-progress');
  if (!progressEl) return; // Safety check

  progressEl.innerHTML = '';

  // Create heading
  const progressHeading = document.createElement('h3');
  progressHeading.textContent = 'Paycheck Allocation';
  progressHeading.className = 'section-heading';
  progressEl.appendChild(progressHeading);

  // Create progress bars for each paycheck
  paychecks.forEach((paycheck, index) => {
    const payProgress = document.createElement('div');
    payProgress.className = 'paycheck-progress-item';

    const percentage = Math.min(100, (paycheck.allocated / paycheck.amount) * 100);
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${percentage}%`;
    if (percentage > 90) progressFill.classList.add('almost-full');

    const label = document.createElement('div');
    label.className = 'progress-label';
    label.innerHTML = `
      <span>Paycheck ${index + 1} (${paycheck.formattedDate})</span>
      <span>${formatCurrency(paycheck.allocated)} / ${formatCurrency(paycheck.amount)}</span>
    `;

    progressBar.appendChild(progressFill);
    payProgress.appendChild(label);
    payProgress.appendChild(progressBar);
    progressEl.appendChild(payProgress);
  });
}

function render() {
  paychecks.sort((a, b) => a.date - b.date);
  const app = document.getElementById('app');
  if (!app) return; // Safety check

  // Build month selector options
  let monthOptions = '';
  MONTH_NAMES.forEach((m, index) => {
    monthOptions += `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${m}</option>`;
  });

  // Calculate total income based on potentially custom paycheck amounts
  const totalIncome = paychecks.reduce((sum, paycheck) => sum + paycheck.amount, 0);
  const payPercent = Math.round((totalMonthlyBills / totalIncome) * 100);
  const monthlyRemaining = totalIncome - totalMonthlyBills;

  // Get icon markup function
  const getIcon = (iconName) => `<i class="fas fa-${iconName}"></i>`;

  // Calculate category spending
  const categorySpending = calculateCategorySpending();

  // Check if we're on a mobile device for layout adjustments
  const isMobile = window.innerWidth <= 768;

  let html = `
    <header class="dashboard-header">
      <h1>${getIcon('wallet')} Budget Planner</h1>
      <div class="month-selector-container">
        <label for="monthSelector">${getIcon('calendar-alt')} </label>
        <select id="monthSelector" class="month-selector">
          ${monthOptions}
        </select>
      </div>
      <h2 class="current-month">${MONTH_NAMES[currentMonth]} ${currentYear}</h2>
    </header>

    <div class="dashboard-grid">
      <div class="dashboard-summary">
        <div class="summary-card total-income">
          <div class="summary-icon">${getIcon('money-bill-wave')}</div>
          <div class="summary-content">
            <h3>Total Income</h3>
            <p>${formatCurrency(totalIncome)}</p>
          </div>
        </div>

        <div class="summary-card total-bills">
          <div class="summary-icon">${getIcon('file-invoice-dollar')}</div>
          <div class="summary-content">
            <h3>Total Bills</h3>
            <p>${formatCurrency(totalMonthlyBills)}</p>
          </div>
        </div>

        <div class="summary-card remaining">
          <div class="summary-icon">${getIcon('piggy-bank')}</div>
          <div class="summary-content">
            <h3>Monthly Remaining</h3>
            <p>${formatCurrency(monthlyRemaining)}</p>
          </div>
        </div>

        <div class="summary-card bill-ratio">
          <div class="summary-icon">${getIcon('chart-pie')}</div>
          <div class="summary-content">
            <h3>Bills to Income</h3>
            <p>${payPercent}%</p>
            <div class="mini-progress">
              <div class="mini-progress-bar" style="width: ${payPercent}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="category-visualization">
        <h3 class="section-heading">${getIcon('chart-pie')} Spending by Category</h3>
        <div id="category-chart" class="category-chart"></div>
      </div>

      <div id="paycheck-progress" class="paycheck-progress">
        <!-- Will be filled by renderPaycheckProgress() -->
      </div>

      <div class="paycheck-section">
        <h3 class="section-heading">${getIcon('calendar-check')} Bill Payment Schedule</h3>
  `;

  // Create paycheck cards
  paychecks.forEach((p, index) => {
    const remainingAmount = p.amount - p.allocated;
    const remainingPercent = (remainingAmount / p.amount) * 100;
    const allocatedPercent = 100 - remainingPercent;

    // Handle edit state
    const editingClass = p.isEditing ? 'editing' : '';

    // Change layout for mobile - simpler, more compact
    html += `
      <div class="paycheck-card ${editingClass}" data-id="${p.id}">
        <div class="paycheck-header">
          <h3>${getIcon('money-check-alt')} Paycheck on ${p.formattedDate}</h3>
          <div class="paycheck-amount-wrapper">
            ${p.isEditing ? `
              <div class="edit-amount-container">
                <input type="number" class="edit-amount-input" value="${p.amount}" min="0" step="10">
                <button class="save-amount-btn">${getIcon('check')} Save</button>
                <button class="cancel-edit-btn">${getIcon('times')} Cancel</button>
              </div>
            ` : `
              <span class="paycheck-amount">${formatCurrency(p.amount)}</span>
              <button class="edit-amount-btn" title="Edit amount">${getIcon('edit')}</button>
            `}
          </div>
        </div>

        <div class="allocation-summary">
          <div class="allocation-bar">
            <div class="allocation-fill" style="width: ${allocatedPercent}%"></div>
          </div>
          <div class="allocation-details">
            <span>Allocated: ${formatCurrency(p.allocated)}</span>
            <span>Remaining: ${formatCurrency(remainingAmount)}</span>
          </div>
        </div>
    `;

    if (p.bills.length) {
      html += `
        <div class="bill-list">
      `;

      // Group bills by category
      const categorizedPaycheckBills = {};
      p.bills.forEach(bill => {
        if (!categorizedPaycheckBills[bill.category]) {
          categorizedPaycheckBills[bill.category] = [];
        }
        categorizedPaycheckBills[bill.category].push(bill);
      });

      // Render bills by category
      Object.entries(categorizedPaycheckBills).forEach(([category, categoryBills]) => {
        html += `
          <div class="bill-category" style="border-left-color: ${CATEGORIES[category].color}">
            <div class="category-header">
              <span class="category-icon" style="background-color: ${CATEGORIES[category].color}">${getIcon(CATEGORIES[category].icon)}</span>
              <h4>${category}</h4>
            </div>
            <div class="category-bills${isMobile ? ' mobile-grid' : ''}">
        `;

        categoryBills.forEach(bill => {
          const statusClass = bill.warning ? 'bill-late' : 'bill-on-time';
          const statusIcon = bill.warning ? 'exclamation-triangle' : 'check-circle';

          html += `
            <div class="bill-item">
              <div class="bill-name">${bill.name}</div>
              <div class="bill-amount">${formatCurrency(bill.due)}</div>
              <div class="bill-due">Due: ${bill.dueDate}</div>
              <div class="bill-status ${statusClass}">${getIcon(statusIcon)}</div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `
        </div>
      `;
    } else {
      html += `<div class="no-bills">${getIcon('info-circle')} No bills allocated to this paycheck.</div>`;
    }

    html += `</div>`;
  });

  html += `
      </div>
    </div>
    <footer class="app-footer">
      <p>Smart Budget Planner © ${currentYear}</p>
      <div class="geometric-pattern"></div>
    </footer>
  `;

  app.innerHTML = html;

  // Add event listeners
  const monthSelector = document.getElementById('monthSelector');
  if (monthSelector) {
    monthSelector.addEventListener('change', e => {
      currentMonth = parseInt(e.target.value, 10);
      update();
    });
  }

  // Edit paycheck amount functionality
  document.querySelectorAll('.edit-amount-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const paycheckCard = this.closest('.paycheck-card');
      const paycheckId = paycheckCard.dataset.id;
      const paycheck = paychecks.find(p => p.id === paycheckId);

      if (paycheck) {
        paycheck.isEditing = true;
        render(); // Re-render with edit mode
      }
    });
  });

  // Save edited amount
  document.querySelectorAll('.save-amount-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const paycheckCard = this.closest('.paycheck-card');
      const paycheckId = paycheckCard.dataset.id;
      const paycheck = paychecks.find(p => p.id === paycheckId);
      const inputElement = paycheckCard.querySelector('.edit-amount-input');

      if (paycheck && inputElement) {
        const newAmount = Math.max(0, parseFloat(inputElement.value) || 0);
        customPaycheckAmounts[paycheckId] = newAmount; // Store the custom amount
        paycheck.amount = newAmount;
        paycheck.isEditing = false;
        update(); // Full update to recalculate allocations with new amount
      }
    });
  });

  // Cancel edit
  document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const paycheckCard = this.closest('.paycheck-card');
      const paycheckId = paycheckCard.dataset.id;
      const paycheck = paychecks.find(p => p.id === paycheckId);

      if (paycheck) {
        paycheck.isEditing = false;
        render(); // Re-render without edit mode
      }
    });
  });

  // Add touch events for mobile
  document.querySelectorAll('.paycheck-card').forEach(card => {
    card.addEventListener('touchstart', function() {
      this.classList.add('touch-active');
    });
    card.addEventListener('touchend', function() {
      this.classList.remove('touch-active');
    });
  });

  // Render charts and progress bars
  renderCategoryChart(categorySpending);
  renderPaycheckProgress();
}

function update() {
  paychecks = allocateBillsForMonth(currentYear, currentMonth);
  render();

  // Update viewport dimensions
  updateViewportHeight();
}

// Handle viewport height issues on mobile
function updateViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Debounce function to limit how often a function runs
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Set initial viewport height
  updateViewportHeight();

  // Handle resize events
  window.addEventListener('resize', debounce(updateViewportHeight, 150));

  // Initialize the application
  update();
});

// Listen for orientation changes on mobile
window.addEventListener('orientationchange', function() {
  setTimeout(updateViewportHeight, 200);
});
