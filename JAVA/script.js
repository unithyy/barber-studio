(function () {
  'use strict';

  var form = document.getElementById('booking-form');
  if (!form) return;

  var success = document.getElementById('booking-success');
  var successText = document.getElementById('success-text');
  var successDetails = document.getElementById('success-details');
  var resetBtn = document.getElementById('booking-reset');
  var submitBtn = form.querySelector('.form__submit');
  var previewList = document.getElementById('preview-details');
  var modal = document.getElementById('confirm-modal');
  var modalList = document.getElementById('modal-details');
  var modalCancel = document.getElementById('modal-cancel');
  var modalConfirm = document.getElementById('modal-confirm');

  var nameInput = form.elements.namedItem('name');
  var phoneInput = form.elements.namedItem('phone');
  var serviceSelect = form.elements.namedItem('service');
  var masterSelect = form.elements.namedItem('master');
  var dateInput = form.elements.namedItem('date');
  var timeFieldset = form.querySelector('.times');
  var timeHint = document.getElementById('b-time-hint');
  var timeList = document.getElementById('b-time-list');

  // Часы приёма: Пн–Пт 10:00–20:00, Сб–Вс 11:00–19:00 (время начала записи, в минутах от полуночи)
  var SLOT_STEP = 30;
  var HOURS = {
    weekday: { start: 10 * 60, end: 20 * 60 },
    weekend: { start: 11 * 60, end: 19 * 60 }
  };
  var BOOKING_DAYS_AHEAD = 60;
  var sending = false;

  // Браузерную проверку отключаем, чтобы показывать собственные сообщения
  form.noValidate = true;

  /* ---------- Дата ---------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function toISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Возвращает Date или null, если строка не является существующей датой
  function parseISO(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    var p = value.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return toISO(d) === value ? d : null;
  }

  // «Сегодня» вычисляется заново при каждом обращении: страница могла быть открыта давно
  function startOfToday() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function lastBookableDay() {
    var t = startOfToday();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() + BOOKING_DAYS_AHEAD);
  }

  function setDateLimits() {
    dateInput.min = toISO(startOfToday());
    dateInput.max = toISO(lastBookableDay());
  }

  function formatDate(value) {
    var d = parseISO(value);
    return d ? d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }

  /* ---------- Слоты времени ---------- */

  function minutesToText(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  function selectedTime() {
    var checked = timeList.querySelector('input:checked');
    return checked ? checked.value : '';
  }

  function isPastSlot(day, timeText) {
    var now = new Date();
    if (toISO(day) !== toISO(now)) return false;
    var p = timeText.split(':');
    return Number(p[0]) * 60 + Number(p[1]) <= now.getHours() * 60 + now.getMinutes();
  }

  function renderSlots() {
    var keep = selectedTime();
    var day = parseISO(dateInput.value);
    var weekend = day && (day.getDay() === 0 || day.getDay() === 6);
    var hours = weekend ? HOURS.weekend : HOURS.weekday;
    var available = 0;

    timeList.textContent = '';
    for (var m = hours.start; m <= hours.end; m += SLOT_STEP) {
      var text = minutesToText(m);
      var disabled = !day || isPastSlot(day, text);

      var label = document.createElement('label');
      label.className = 'time';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'time';
      input.value = text;
      input.disabled = disabled;
      if (!disabled) {
        available++;
        if (text === keep) input.checked = true;
      }
      var span = document.createElement('span');
      span.textContent = text;
      label.appendChild(input);
      label.appendChild(span);
      timeList.appendChild(label);
    }

    if (!day) {
      timeHint.textContent = 'Сначала выберите дату';
    } else if (available === 0) {
      timeHint.textContent = 'На эту дату время уже прошло. Выберите другой день.';
    } else {
      timeHint.textContent = 'Часы приёма студии. В демо занятость мастеров не проверяется.';
    }

    if (selectedTime()) clearError(timeFieldset);
    updatePreview();
  }

  /* ---------- Стоимость, строки сводки, предпросмотр ---------- */

  var priceFormat = new Intl.NumberFormat('ru-RU');

  function getPrice() {
    var option = serviceSelect.options[serviceSelect.selectedIndex];
    if (!option || !option.value) return '';
    var text = priceFormat.format(Number(option.getAttribute('data-price'))) + ' ₽';
    return option.hasAttribute('data-from') ? 'от ' + text : text;
  }

  function collectRows(withContacts) {
    var rows = [];
    if (withContacts) {
      rows.push(['Имя', nameInput.value.trim()]);
      rows.push(['Телефон', phoneInput.value.trim()]);
    }
    rows.push(['Услуга', serviceSelect.value]);
    rows.push(['Мастер', masterSelect.value]);
    rows.push(['Дата', formatDate(dateInput.value)]);
    rows.push(['Время', selectedTime()]);
    rows.push(['Стоимость', getPrice(), true]);
    return rows;
  }

  function renderRows(list, rows) {
    list.textContent = '';
    rows.forEach(function (row) {
      var wrap = document.createElement('div');
      wrap.className = 'success__row' + (row[2] ? ' success__row--total' : '');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = row[0];
      dd.textContent = row[1] || '—';
      if (!row[1]) dd.className = 'is-empty';
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      list.appendChild(wrap);
    });
  }

  function updatePreview() { renderRows(previewList, collectRows(false)); }

  /* ---------- Ошибки ---------- */

  function errorBox(field) {
    return document.getElementById(field === timeFieldset ? 'b-time-error' : field.id + '-error');
  }

  function setError(field, message) {
    var box = errorBox(field);
    if (box) box.textContent = message;
    if (field === timeFieldset) field.classList.add('is-invalid');
    else field.setAttribute('aria-invalid', 'true');
  }

  function clearError(field) {
    var box = errorBox(field);
    if (box) box.textContent = '';
    if (field === timeFieldset) field.classList.remove('is-invalid');
    else field.removeAttribute('aria-invalid');
  }

  /* ---------- Правила проверки ---------- */

  function validateName() {
    var value = nameInput.value.trim();
    if (!value) return 'Введите имя';
    if (!/^[\p{L}][\p{L}\s'’-]+$/u.test(value)) return 'Имя может содержать только буквы, пробел и дефис';
    return '';
  }

  function validatePhone() {
    var value = phoneInput.value.trim();
    if (!value) return 'Введите номер телефона';
    if (!/^\+?[\d\s()-]+$/.test(value)) return 'Номер может содержать только цифры, пробелы, скобки, дефис и «+»';

    var digits = value.replace(/\D/g, '');
    if (value.charAt(0) === '+') {
      return digits.length >= 10 && digits.length <= 15 ? '' : 'Проверьте номер: после «+» должно быть от 10 до 15 цифр';
    }
    if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) return '';
    if (digits.length === 10 && digits.charAt(0) === '9') return '';
    return 'Введите номер в формате +7 900 000-00-00';
  }

  function validateSelect(select, message) { return select.value ? '' : message; }

  function validateDate() {
    var day = parseISO(dateInput.value);
    if (!day) return 'Выберите дату визита';
    if (day < startOfToday()) return 'Нельзя записаться на прошедшую дату';
    if (day > lastBookableDay()) return 'Запись доступна не более чем на ' + BOOKING_DAYS_AHEAD + ' дней вперёд';
    return '';
  }

  function validateTime() {
    var time = selectedTime();
    if (!time) return 'Выберите время визита';
    var day = parseISO(dateInput.value);
    if (day && isPastSlot(day, time)) return 'Это время уже прошло. Выберите другое.';
    return '';
  }

  var rules = [
    { field: nameInput, check: validateName },
    { field: phoneInput, check: validatePhone },
    { field: serviceSelect, check: function () { return validateSelect(serviceSelect, 'Выберите услугу'); } },
    { field: masterSelect, check: function () { return validateSelect(masterSelect, 'Выберите мастера'); } },
    { field: dateInput, check: validateDate },
    { field: timeFieldset, check: validateTime }
  ];

  function runRule(rule) {
    var message = rule.check();
    if (message) { setError(rule.field, message); return false; }
    clearError(rule.field);
    return true;
  }

  // Возвращает первое некорректное поле или null
  function validateAll() {
    var firstInvalid = null;
    rules.forEach(function (rule) {
      if (!runRule(rule) && !firstInvalid) firstInvalid = rule.field;
    });
    return firstInvalid;
  }

  function focusField(field) {
    if (field === timeFieldset) {
      var first = timeList.querySelector('input:not(:disabled)');
      (first || dateInput).focus();
    } else {
      field.focus();
    }
  }

  /* ---------- События полей ---------- */

  // Телефон: убираем недопустимые символы прямо при вводе
  phoneInput.addEventListener('input', function () {
    var cleaned = phoneInput.value.replace(/[^\d\s()+-]/g, '');
    if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
  });

  rules.forEach(function (rule) {
    var field = rule.field;
    if (field === timeFieldset) return;
    field.addEventListener('blur', function () {
      if (field.value || field.hasAttribute('aria-invalid')) runRule(rule);
    });
    var evt = field.tagName === 'SELECT' || field.type === 'date' ? 'change' : 'input';
    field.addEventListener(evt, function () {
      if (field.hasAttribute('aria-invalid')) runRule(rule);
    });
  });

  dateInput.addEventListener('focus', setDateLimits);
  dateInput.addEventListener('change', renderSlots);
  dateInput.addEventListener('input', renderSlots);
  serviceSelect.addEventListener('change', updatePreview);
  masterSelect.addEventListener('change', updatePreview);
  timeList.addEventListener('change', function () {
    clearError(timeFieldset);
    updatePreview();
  });

  /* ---------- Модальное окно подтверждения ---------- */

  function cleanupModal() {
    document.documentElement.classList.remove('modal-open');
    if (!form.hidden && !sending) submitBtn.focus();
  }

  function openModal() {
    renderRows(modalList, collectRows(true));
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    document.documentElement.classList.add('modal-open');
    modalConfirm.focus();
  }

  function closeModal() {
    if (typeof modal.close === 'function') {
      if (modal.open) modal.close();
    } else {
      modal.removeAttribute('open');
      cleanupModal();
    }
  }

  modal.addEventListener('close', cleanupModal);
  modal.addEventListener('cancel', function (event) { if (sending) event.preventDefault(); });
  modal.addEventListener('click', function (event) {
    if (event.target === modal && !sending) closeModal();
  });
  modalCancel.addEventListener('click', closeModal);

  /* ---------- Отправка (демонстрация, без backend) ---------- */

  function showSuccess(data) {
    var firstName = data.name.split(/\s+/)[0];
    successText.textContent = firstName + ', это демонстрация: данные никуда не отправлены и не сохранены. ' +
      'В рабочей версии мы позвонили бы на ' + data.phone + ' и подтвердили визит.';
    renderRows(successDetails, collectRows(false));
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var firstInvalid = validateAll();
    if (firstInvalid) { focusField(firstInvalid); return; }
    openModal();
  });

  modalConfirm.addEventListener('click', function () {
    if (sending) return;

    // Повторная проверка: за время просмотра время могло пройти
    var firstInvalid = validateAll();
    if (firstInvalid) {
      closeModal();
      renderSlots();
      focusField(firstInvalid);
      return;
    }

    var data = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      service: serviceSelect.value,
      master: masterSelect.value,
      date: dateInput.value,
      time: selectedTime(),
      price: getPrice()
    };

    sending = true;
    modalConfirm.disabled = true;
    modalCancel.disabled = true;
    modalConfirm.textContent = 'Отправляем…';

    // Имитация запроса. Здесь будет fetch() на реальный endpoint.
    window.setTimeout(function () {
      console.log('Демо-запись (данные никуда не отправлены):', data);
      showSuccess(data);
      sending = false;
      closeModal();
      modalConfirm.disabled = false;
      modalCancel.disabled = false;
      modalConfirm.textContent = 'Подтвердить запись';
    }, 900);
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    rules.forEach(function (rule) { clearError(rule.field); });
    renderSlots();
    success.hidden = true;
    form.hidden = false;
    nameInput.focus();
  });

  setDateLimits();
  renderSlots();
})();
