const sheets = require('./google.js');

// Русские месяцы в порядке
const months = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

async function updateDate(table3Id, table2Id) {
  console.log("Запускаю расчёт месячного прироста...");

  // Определяем текущий месяц
  const now = new Date();
  const currentMonthName = months[now.getMonth()]; // Август → Сентябрь → ...
  const currentMonthIndex = months.indexOf(currentMonthName);

  // Определяем прошлый месяц
  const prevMonthName = currentMonthIndex === 0
    ? null // Август — первый месяц
    : months[currentMonthIndex - 1];

  console.log("Текущий месяц:", currentMonthName);
  console.log("Прошлый месяц:", prevMonthName || "нет (первый месяц)");

  // Читаем лист 2026 из Таблицы 3
  const resYear = await sheets.spreadsheets.values.get({
    spreadsheetId: table3Id,
    range: `2026!A1:Z500`
  });

  const yearRows = resYear.data.values || [];
  const headers = yearRows[0];

  // Читаем лист текущего месяца Таблицы 3
  const resCurrentMonth = await sheets.spreadsheets.values.get({
    spreadsheetId: table3Id,
    range: `${currentMonthName}!A1:Z500`
  });

  const currentMonthRows = resCurrentMonth.data.values || [];

  // Если прошлый месяц есть — читаем его из Таблицы 2
  let prevMonthRows = null;

  if (prevMonthName) {
    const resPrev = await sheets.spreadsheets.values.get({
      spreadsheetId: table2Id,
      range: `${prevMonthName}!A1:Z500`
    });
    prevMonthRows = resPrev.data.values || [];
  }

  // Индексы нужных колонок
  const colAhelp = headers.indexOf("АХелпы");
  const colTickets = headers.indexOf("Тикеты") !== -1 ? headers.indexOf("Тикеты") : headers.indexOf("Отклики");
  const colComplaints = headers.indexOf("Жалобы");
  const colAppeals = headers.indexOf("Обжалования");
  const colOpened = headers.indexOf("Открытые");
  const colClosed = headers.indexOf("Закрытые");
  const colAmnesty = headers.indexOf("Амнистии");

  // Обрабатываем каждую строку
  for (let i = 1; i < yearRows.length; i++) {
    const yearRow = yearRows[i];
    const currentRow = currentMonthRows[i] || [];

    // Если нет прошлого месяца → Август = 2026
    if (!prevMonthRows) {
      currentRow[colAhelp] = yearRow[colAhelp];
      currentRow[colTickets] = yearRow[colTickets];
      currentRow[colComplaints] = yearRow[colComplaints];
      currentRow[colAppeals] = yearRow[colAppeals];
      currentRow[colOpened] = yearRow[colOpened];
      currentRow[colClosed] = yearRow[colClosed];
      currentRow[colAmnesty] = yearRow[colAmnesty];
    } else {
      const prevRow = prevMonthRows[i] || [];

      currentRow[colAhelp] = Number(yearRow[colAhelp] || 0) - Number(prevRow[colAhelp] || 0);
      currentRow[colTickets] = Number(yearRow[colTickets] || 0) - Number(prevRow[colTickets] || 0);
      currentRow[colComplaints] = Number(yearRow[colComplaints] || 0) - Number(prevRow[colComplaints] || 0);
      currentRow[colAppeals] = Number(yearRow[colAppeals] || 0) - Number(prevRow[colAppeals] || 0);
      currentRow[colOpened] = Number(yearRow[colOpened] || 0) - Number(prevRow[colOpened] || 0);
      currentRow[colClosed] = Number(yearRow[colClosed] || 0) - Number(prevRow[colClosed] || 0);
      currentRow[colAmnesty] = Number(yearRow[colAmnesty] || 0) - Number(prevRow[colAmnesty] || 0);
    }

    currentMonthRows[i] = currentRow;
  }

  // Записываем результат в Таблицу 3 → текущий месяц
  await sheets.spreadsheets.values.update({
    spreadsheetId: table3Id,
    range: `${currentMonthName}!A1:Z500`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: currentMonthRows }
  });

  console.log("Месячный прирост успешно записан.");
}

module.exports = updateDate;