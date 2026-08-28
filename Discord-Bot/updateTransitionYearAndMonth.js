const sheets = require('./google.js');

async function updateTransitionYearAndMonth(
  sourceId,        // Таблица 1
  sourceSheet,     // "Таблица"
  namesId,         // Таблица 2
  namesSheet,      // "Модераторы(Дискорд И Дискорд ID)"
  transitionId,    // Таблица 3
  yearSheet,       // "2026"
  monthSheet       // "Август", "Сентябрь", ...
) {
  console.log('Начинаю обновление годового и месячного свода...');

  // 1️⃣ Читаем таблицу 1
  const resSource = await sheets.spreadsheets.values.get({
    spreadsheetId: sourceId,
    range: `${sourceSheet}!A1:Z500`
  });
  const sourceRows = resSource.data.values || [];
  const sourceHeaders = sourceRows[0];

  // 2️⃣ Читаем таблицу 2 (имена)
  const resNames = await sheets.spreadsheets.values.get({
    spreadsheetId: namesId,
    range: `${namesSheet}!A2:B500`
  });
  const namesRows = resNames.data.values || [];

  const idToName = {};
  for (const row of namesRows) {
    const discord = row[0];
    const discordId = row[1];
    if (discordId) idToName[discordId] = discord;
  }

  // 3️⃣ Читаем таблицу 3 — годовой лист
  const resYear = await sheets.spreadsheets.values.get({
    spreadsheetId: transitionId,
    range: `${yearSheet}!A1:Z500`
  });
  const yearRows = resYear.data.values || [];
  const yearHeaders = yearRows[0];

  // Колонки таблицы 3
  const colDiscord = yearHeaders.indexOf("Дискорд");
  const colAhelp = yearHeaders.indexOf("АХелпы");
  const colTickets = yearHeaders.indexOf("Тикеты") !== -1 ? yearHeaders.indexOf("Тикеты") : yearHeaders.indexOf("Отклики");
  const colComplaints = yearHeaders.indexOf("Жалобы");
  const colAppeals = yearHeaders.indexOf("Обжалования");
  const colOpened = yearHeaders.indexOf("Открытые");
  const colClosed = yearHeaders.indexOf("Закрытые");
  const colAmnesty = yearHeaders.indexOf("Амнистии");

  // Колонки таблицы 1
  const srcAhelp = sourceHeaders.indexOf("Ahelp");
  const srcTickets = sourceHeaders.indexOf("Тикеты") !== -1 ? sourceHeaders.indexOf("Тикеты") : sourceHeaders.indexOf("Отклики");
  const srcComplaints = sourceHeaders.indexOf("Жалобы");
  const srcAppeals = sourceHeaders.indexOf("Обжалования");
  const srcOpened = sourceHeaders.indexOf("Открытые");
  const srcClosed = sourceHeaders.indexOf("Закрытые");
  const srcAmnesty = sourceHeaders.indexOf("Амнистии");

  // 4️⃣ Создаём массив накопленных данных для Таблицы 2
  const archiveRows = [
    ["Дискорд", "АХелпы", "Тикеты", "Жалобы", "Обжалования", "Открытые", "Закрытые", "Амнистии"]
  ];

  for (let i = 1; i < sourceRows.length; i++) {
    const row = sourceRows[i];
    if (!row[0]) continue;

    const raw = row[0].split('\n');
    const discordId = raw[1];
    if (!discordId) continue;

    const discordName = idToName[discordId];
    if (!discordName) {
      console.log(`Не найдено сопоставление для ID ${discordId}`);
      continue;
    }

    const ahelp = Number(row[srcAhelp] || 0);
    const tickets = Number(row[srcTickets] || 0);
    const complaints = Number(row[srcComplaints] || 0);
    const appeals = Number(row[srcAppeals] || 0);
    const opened = Number(row[srcOpened] || 0);
    const closed = Number(row[srcClosed] || 0);
    const amnesty = Number(row[srcAmnesty] || 0);

    // Обновляем годовой лист
    const yearIndex = yearRows.findIndex(r => r[colDiscord] === discordName);
    if (yearIndex !== -1) {
      yearRows[yearIndex][colAhelp] = ahelp;
      yearRows[yearIndex][colTickets] = tickets;
      yearRows[yearIndex][colComplaints] = complaints;
      yearRows[yearIndex][colAppeals] = appeals;
      yearRows[yearIndex][colOpened] = opened;
      yearRows[yearIndex][colClosed] = closed;
      yearRows[yearIndex][colAmnesty] = amnesty;
    }

    // Добавляем накопленные данные в архив
    archiveRows.push([
      discordName,
      ahelp,
      tickets,
      complaints,
      appeals,
      opened,
      closed,
      amnesty
    ]);
  }

  // 5️⃣ Записываем годовой лист
  await sheets.spreadsheets.values.update({
    spreadsheetId: transitionId,
    range: `${yearSheet}!A1:Z500`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: yearRows }
  });

  // 6️⃣ Записываем накопленные данные в Таблицу 2 → лист текущего месяца
  await sheets.spreadsheets.values.update({
    spreadsheetId: namesId,
    range: `${monthSheet}!A1:H500`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: archiveRows }
  });

  console.log(`Таблица 2 обновлена: ${monthSheet}`);
  console.log('Годовой свод обновлён.');
}

module.exports = updateTransitionYearAndMonth;
