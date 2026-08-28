const sheets = require('./google.js');

/**
 * Перенос категорий актива из таблицы 3 → таблицу 4
 * @param {string} transitionId - ID таблицы 3
 * @param {string} monthSheet - лист текущего месяца в таблице 3
 * @param {string} mainId - ID таблицы 4
 */
async function updateMain(transitionId, monthSheet, mainId) {
  console.log('Начинаю перенос категорий в таблицу 4...');

  // 1. Читаем месячный свод (таблица 3)
  const resMonth = await sheets.spreadsheets.values.get({
    spreadsheetId: transitionId,
    range: `${monthSheet}!A2:K500`
  });

  const monthRows = resMonth.data.values || [];

  // Создаём карту Discord → Категория
  const categoryMap = {};
  for (const row of monthRows) {
    const discord = row[1];
    const category = row[10]; // колонка K

    if (discord) {
      categoryMap[discord] = category || '';
    }
  }

  // 2. Читаем таблицу 4 (лист "Состав")
  const resMain = await sheets.spreadsheets.values.get({
    spreadsheetId: mainId,
    range: `Состав!A2:Z500`
  });

  const mainRows = resMain.data.values || [];

  // 3. Обновляем категории в колонке G
  for (const row of mainRows) {
    const discord = row[1]; // колонка B

    if (discord && categoryMap[discord]) {
      row[6] = categoryMap[discord]; // колонка G
    }
  }

  // 4. Записываем обратно
  await sheets.spreadsheets.values.update({
    spreadsheetId: mainId,
    range: `Состав!A2:Z500`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: mainRows }
  });

  console.log('Категории успешно перенесены в таблицу 4.');
}

module.exports = updateMain;
