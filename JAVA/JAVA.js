(function () {
  'use strict';

  var form = document.getElementById('booking-form');
  if (!form) return;

  var success = document.getElementById('booking-success');
  var successText = document.getElementById('success-text');
  var successDetails = document.getElementById('success-details');
  var resetBtn = document.getElementById('booking-reset');
  var submitBtn = form.querySelector('.form__submit');

  var nameInput = form.elements.namedItem('name');
  var phoneInput = form.elements.namedItem('phone');
  var serviceSelect = form.elements.namedItem('service');
  var masterSelect = form.elements.namedItem('master');
  var dateInput = form.elements.namedItem('date');
  var timeFieldset = form.querySelector('.times');
  var timeHint = document.getElementById('b-time-hint');
  var timeRadios = Array.prototype.slice.call(form.querySelectorAll('input[name="time"]'));

  // Режим работы: Пн–Пт 10:00–21:00, Сб–Вс 11:00–20:00 (последняя запись за час до закрытия)
  var WEEKEND_CLOSED_SLOTS = ['10:00', '20:00'];
  var BOOKING_DAYS_AHEAD = 60;

  // Браузерную проверку отключаем, чтобы показывать собственные сообщения
  form.noValidate = true;

  /* ---------- Дата ---------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function toISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseISO(value) {
    var parts = value.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  var today = new Date();
  var maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + BOOKING_DAYS_AHEAD);
  dateInput.min = toISO(today);
  dateInput.max = toISO(maxDate);

  /* ---------- Доступные слоты времени ---------- */

  function updateTimeSlots() {
    var hasDate = Boolean(dateInput.value);
    var selected = null;

    timeRadios.forEach(function (radio) {
      var disabled = !hasDate;

      if (hasDate) {
        var day = parseISO(dateInput.value);
        var isWeekend = day.getDay() === 0 || day.getDay() === 6;
        var hour = Number(radio.value.split(':')[0]);
        var now = new Date();

        if (isWeekend && WEEKEND_CLOSED_SLOTS.indexOf(radio.value) !== -1) disabled = true;

        // Если выбран сегодняшний день, прошедшие часы недоступны
        if (toISO(day) === toISO(now) && hour <= now.getHours()) disabled = true;
      }

      radio.disabled = disabled;
      if (disabled && radio.checked) radio.checked = false;
      if (radio.checked) selected = radio;
    });

    var available = timeRadios.filter(function (r) { return !r.disabled; }).length;
    if (!hasDate) {
      timeHint.textContent = 'Сначала выберите дату';
    } else if (available === 0) {
      timeHint.textContent = 'На эту дату свободного времени нет. Выберите другой день.';
    } else {
      timeHint.textContent = 'Свободное время на выбранную дату';
    }

    if (selected) clearError(timeFieldset);
  }

  /* ---------- Ошибки ---------- */

  function errorBox(field) {
    return document.getElementById(
      field === timeFieldset ? 'b-time-error' : field.id + '-error'
    );
  }

  function setError(field, message) {
    var box = errorBox(field);
    if (box) box.textContent = message;
    if (field === timeFieldset) {
      field.classList.add('is-invalid');
    } else {
      field.setAttribute('aria-invalid', 'true');
    }
  }

  function clearError(field) {
    var box = errorBox(field);
    if (box) box.textContent = '';
    if (field === timeFieldset) {
      field.classList.remove('is-invalid');
    } else {
      field.removeAttribute('aria-invalid');
    }
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
    var international = value.charAt(0) === '+';

    if (international) {
      if (digits.length < 10 || digits.length > 15) return 'Проверьте номер: после «+» должно быть от 10 до 15 цифр';
      return '';
    }
    if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) return '';
    if (digits.length === 10 && digits.charAt(0) === '9') return '';
    return 'Введите номер в формате +7 900 000-00-00';
  }

  function validateSelect(select, message) {
    return select.value ? '' : message;
  }

  function validateDate() {
    if (!dateInput.value) return 'Выберите дату визита';
    var day = parseISO(dateInput.value);
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isNaN(day.getTime())) return 'Выберите дату визита';
    if (day < start) return 'Нельзя записаться на прошедшую дату';
    if (day > maxDate) return 'Запись доступна не более чем на ' + BOOKING_DAYS_AHEAD + ' дней вперёд';
    return '';
  }

  function validateTime() {
    var checked = timeRadios.some(function (r) { return r.checked; });
    return checked ? '' : 'Выберите время визита';
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
    if (message) {
      setError(rule.field, message);
      return false;
    }
    clearError(rule.field);
    return true;
  }

  function validateAll() {
    var firstInvalid = null;
    rules.forEach(function (rule) {
      if (!runRule(rule) && !firstInvalid) firstInvalid = rule.field;
    });
    return firstInvalid;
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
    // Показываем ошибку после ухода из поля, а убираем сразу при исправлении
    field.addEventListener('blur', function () {
      if (field.value || field.hasAttribute('aria-invalid')) runRule(rule);
    });
    var evt = field.tagName === 'SELECT' || field.type === 'date' ? 'change' : 'input';
    field.addEventListener(evt, function () {
      if (field.hasAttribute('aria-invalid')) runRule(rule);
    });
  });

  dateInput.addEventListener('change', updateTimeSlots);
  timeRadios.forEach(function (radio) {
    radio.addEventListener('change', function () { clearError(timeFieldset); });
  });

  /* ---------- Отправка (демонстрация, без backend) ---------- */

  function formatDate(value) {
    return parseISO(value).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  function showSuccess(data) {
    var firstName = data.name.split(/\s+/)[0];
    successText.textContent = firstName + ', мы ждём вас. Позвоним на ' + data.phone + ', чтобы подтвердить визит.';

    var rows = [
      ['Услуга', data.service],
      ['Мастер', data.master],
      ['Дата', formatDate(data.date)],
      ['Время', data.time]
    ];

    successDetails.textContent = '';
    rows.forEach(function (row) {
      var wrap = document.createElement('div');
      wrap.className = 'success__row';
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = row[0];
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      successDetails.appendChild(wrap);
    });

    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var firstInvalid = validateAll();
    if (firstInvalid) {
      var target = firstInvalid === timeFieldset
        ? (timeRadios.filter(function (r) { return !r.disabled; })[0] || dateInput)
        : firstInvalid;
      target.focus();
      return;
    }

    var checkedTime = timeRadios.filter(function (r) { return r.checked; })[0];
    var data = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      service: serviceSelect.value,
      master: masterSelect.value,
      date: dateInput.value,
      time: checkedTime.value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';

    // Имитация запроса к серверу. Здесь будет fetch() на реальный endpoint.
    window.setTimeout(function () {
      console.log('Демо-запись (данные никуда не отправлены):', data);
      showSuccess(data);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Записаться';
    }, 900);
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    rules.forEach(function (rule) { clearError(rule.field); });
    updateTimeSlots();
    success.hidden = true;
    form.hidden = false;
    nameInput.focus();
  });

  updateTimeSlots();
})();
