require('dotenv').config();
const db = require('./db');
const sheets = require('./google.js');
const { Client, GatewayIntentBits } = require('discord.js');
const updateTransitionYearAndMonth = require('./updateTransitionYearAndMonth');
const updateActivity = require('./updateActivity');
const updateMain = require('./updateMain');
const updateDate = require('./updateDate');
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
function getCurrentMonthName() {
  const now = new Date();
  return MONTHS[now.getMonth()];
}

function getPreviousMonthName() {
  const now = new Date();
  const index = now.getMonth();

  if (index === 0) return null; // Август — первый месяц

  return MONTHS[index - 1];
}
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('clientReady', () => {
    client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === 'статистика-модератора') {
  const login = interaction.options.getString('логин');
  await interaction.deferReply();

  try {
    console.log('Начало обработки статистики модератора');

    // Читаем основной лист статистики
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:I200'
    });

    // Читаем листы ссылок
    const resComplaintsLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:B200'
    });

    const resMiniLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Мини-Жалобы!A1:B200'
    });

    const resAppealLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Обжалования!A1:B200'
    });

    const rows = resStats.data.values || [];
    const complaintLinksRows = resComplaintsLinks.data.values || [];
    const miniLinksRows = resMiniLinks.data.values || [];
    const appealLinksRows = resAppealLinks.data.values || [];

    console.log('Данные получены:', rows.length);

    const modRow = rows.find(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (!modRow) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    const rowIndex = rows.indexOf(modRow);

    // Читаем форматирование (цвет)
    const sheetData = await sheets.spreadsheets.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      ranges: ['Статистика!A1:I200'],
      includeGridData: true
    });

    const grid = sheetData.data.sheets[0].data[0].rowData;
    const cell = grid[rowIndex]?.values?.[2];
    const color = cell?.effectiveFormat?.backgroundColor || {};

    let active = 'Неизвестно';

    function isGreen(c) {
      return c.red > 0.50 && c.red < 0.65 &&
             c.green > 0.70 && c.green < 0.80 &&
             c.blue > 0.45 && c.blue < 0.55;
    }

    function isRed(c) {
      return c.red > 0.80 && c.red < 0.95 &&
             c.green > 0.35 && c.green < 0.45 &&
             c.blue > 0.35 && c.blue < 0.45;
    }

    if (isGreen(color)) active = 'Да';
    else if (isRed(color)) active = 'Нет';

    // Определяем роль
    function getRole(rows, rowIndex) {
      if (rows[rowIndex][0] && rows[rowIndex][0].trim() !== '') {
        return rows[rowIndex][0];
      }
      for (let i = rowIndex - 1; i >= 0; i--) {
        if (rows[i][0] && rows[i][0].trim() !== '') {
          return rows[i][0];
        }
      }
      return 'Без роли';
    }

    const role = getRole(rows, rowIndex);
    const name = modRow[1];

    // --- Жалобы ---
    const rawComplaints = modRow.slice(3, 5).filter(v => v && v.trim() !== '');
    const complaintLinks = rawComplaints.length === 0
      ? 'Нет'
      : rawComplaints.map(num => {
          const linkRow = complaintLinksRows.find(r => r[0] == num);
          return linkRow ? `[${num}](${linkRow[1]})` : num;
        }).join(', ');

    // --- Мини-жалобы ---
    const rawMini = modRow.slice(5, 7).filter(v => v && v.trim() !== '');
    const miniLinks = rawMini.length === 0
      ? 'Нет'
      : rawMini.map(num => {
          const linkRow = miniLinksRows.find(r => r[0] == num);
          return linkRow ? `[${num}](${linkRow[1]})` : num;
        }).join(', ');

    // --- Обжалования ---
    const rawAppeals = modRow.slice(7, 9).filter(v => v && v.trim() !== '');
    const appealLinks = rawAppeals.length === 0
      ? 'Нет'
      : rawAppeals.map(num => {
          const linkRow = appealLinksRows.find(r => r[0] == num);
          return linkRow ? `[${num}](${linkRow[1]})` : num;
        }).join(', ');

    // --- EMBED ---
    const embed = {
      color: 0x1b37a3,
      title: `${name}`,
      description:
        `🌀 **Ранг:** ${role}\n\n` +
        `🔒 **Работает:** ${active}\n\n` +
        `**Жалобы:** ${rawComplaints.length}\n${complaintLinks}\n\n` +
        `**Мини‑жалобы:** ${rawMini.length}\n${miniLinks}\n\n` +
        `**Обжалования:** ${rawAppeals.length}\n${appealLinks}`
    };

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка чтения таблицы.');
  }
}


if (interaction.commandName === 'просмотр-бд') {
  // проверка UID
  if (interaction.user.id !== '767044685935542295') {
    return interaction.reply('⛔ У вас нет доступа к этой команде.');
  }

  await interaction.deferReply();

  try {
    const rows = db.prepare('SELECT * FROM complaints').all();

    if (rows.length === 0) {
      return interaction.editReply('📦 База данных пуста.');
    }

    let text = '📦 **Содержимое базы данных жалоб:**\n\n';

    for (const r of rows) {
      text += `• \`${r.complaint}\` — ${r.moderator} — ${r.url}\n`;
    }

    interaction.editReply(text);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка чтения базы данных.');
  }
}


if (interaction.commandName === 'внести-жалобу') {
  const login = interaction.options.getString('логин');
  const complaint = interaction.options.getString('жалоба');
  const url = interaction.options.getString('url');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Жалобы"
    const resLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:B200'
    });

    const linksRows = resLinks.data.values || [];

    // Находим первую пустую строку
    const emptyRowIndex = linksRows.findIndex(r => !r[0] && !r[1]);
    const rowToWrite = emptyRowIndex === -1 ? linksRows.length + 1 : emptyRowIndex + 1;

    // Записываем жалобу в лист "Жалобы"
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Жалобы!A${rowToWrite}:B${rowToWrite}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[complaint, url]] }
    });

    // 2️⃣ Ждём 5 секунд
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    // Находим модератора
    const modRowIndex = rows.findIndex(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (modRowIndex === -1) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    const modRow = rows[modRowIndex];

    // гарантируем, что строка имеет хотя бы 5 колонок (до E)
    while (modRow.length < 5) {
      modRow.push('');
    }

    // ищем первую пустую ячейку начиная с D (индекс 3) и E (индекс 4)
    let colIndex = modRow.findIndex((v, i) => i >= 3 && i <= 4 && (!v || v.trim() === ''));

    if (colIndex === -1) {
      colIndex = 3; // всегда D или E
    }

    const colLetter = String.fromCharCode(65 + colIndex);

    // 4️⃣ Вставляем формулу HYPERLINK
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Статистика!${colLetter}${modRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[`=HYPERLINK("${url}"; "${complaint}")`]]
      }
    });

    interaction.editReply(`Жалоба **${complaint}** успешно внесена модератору **${login}**.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при внесении жалобы.');
  }
}


if (interaction.commandName === 'внести-мини-жалобу') {
  const login = interaction.options.getString('логин');
  const complaint = interaction.options.getString('дата');
  const url = interaction.options.getString('url');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Мини-Жалобы"
    const resMini = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Мини-Жалобы!A1:B200'
    });

    const miniRows = resMini.data.values || [];

    // Находим первую пустую строку
    const emptyRowIndex = miniRows.findIndex(r => !r[0] && !r[1]);
    const rowToWrite = emptyRowIndex === -1 ? miniRows.length + 1 : emptyRowIndex + 1;

    // Записываем мини-жалобу
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Мини-Жалобы!A${rowToWrite}:B${rowToWrite}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[complaint, url]] }
    });

    // 2️⃣ Ждём 5 секунд
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    // Находим модератора
    const modRowIndex = rows.findIndex(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (modRowIndex === -1) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    const modRow = rows[modRowIndex];

    // гарантируем, что строка имеет хотя бы 7 колонок (до F)
    while (modRow.length < 7) {
      modRow.push('');
    }

    // ищем первую пустую ячейку начиная с F (индекс 5)
    let colIndex = modRow.findIndex((v, i) => i >= 5 && i <= 6 && (!v || v.trim() === ''));

    if (colIndex === -1) {
      colIndex = 5; // всегда F или G
    }

    const colLetter = String.fromCharCode(65 + colIndex);

    // 4️⃣ Вставляем формулу HYPERLINK
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Статистика!${colLetter}${modRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[`=HYPERLINK("${url}"; "${complaint}")`]]
      }
    });

    interaction.editReply(`Мини‑жалоба **${complaint}** успешно внесена модератору **${login}**.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при внесении мини‑жалобы.');
  }
}

if (interaction.commandName === 'внести-обжалование') {
  const login = interaction.options.getString('логин');
  const complaint = interaction.options.getString('обжалование');
  const url = interaction.options.getString('url');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Обжалования"
    const resAppeals = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Обжалования!A1:B200'
    });

    const appealRows = resAppeals.data.values || [];

    // Находим первую пустую строку
    const emptyRowIndex = appealRows.findIndex(r => !r[0] && !r[1]);
    const rowToWrite = emptyRowIndex === -1 ? appealRows.length + 1 : emptyRowIndex + 1;

    // Записываем обжалование
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Обжалования!A${rowToWrite}:B${rowToWrite}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[complaint, url]] }
    });

    // 2️⃣ Ждём 5 секунд
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    // Находим модератора
    const modRowIndex = rows.findIndex(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (modRowIndex === -1) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    const modRow = rows[modRowIndex];

    // гарантируем, что строка имеет хотя бы 9 колонок (до H)
    while (modRow.length < 9) {
      modRow.push('');
    }

    // ищем первую пустую ячейку начиная с H (индекс 7)
    let colIndex = modRow.findIndex((v, i) => i >= 7 && i <= 8 && (!v || v.trim() === ''));

    if (colIndex === -1) {
      colIndex = 7; // всегда H или I
    }

    const colLetter = String.fromCharCode(65 + colIndex);

    // 4️⃣ Вставляем формулу HYPERLINK
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Статистика!${colLetter}${modRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[`=HYPERLINK("${url}"; "${complaint}")`]]
      }
    });

    interaction.editReply(`Обжалование **${complaint}** успешно внесено модератору **${login}**.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при внесении обжалования.');
  }
}


if (interaction.commandName === 'закрыть-жалобу') {
  const complaint = interaction.options.getString('жалоба');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Жалобы"
    const resLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:B200'
    });

    const linksRows = resLinks.data.values || [];

    // Находим строку жалобы
    const linkRowIndex = linksRows.findIndex(r => r[0] && r[0].toString() === complaint);

    // Если жалоба есть в листе "Жалобы" — удаляем
    if (linkRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
        range: `Жалобы!A${linkRowIndex + 1}:B${linkRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', '']] }
      });
    }

    // 2️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    let removed = false;

    // 3️⃣ Ищем жалобу ТОЛЬКО в колонках D–E (индексы 3 и 4)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // ищем жалобу только в D и E
      const colIndex = row.findIndex(
        (v, idx) => (idx === 3 || idx === 4) && v && v.toString() === complaint
      );

      if (colIndex !== -1) {
        const colLetter = String.fromCharCode(65 + colIndex);

        // очищаем ячейку (удаляем формулу или текст)
        await sheets.spreadsheets.values.update({
          spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
          range: `Статистика!${colLetter}${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['']] }
        });

        removed = true;
        break;
      }
    }

    if (!removed) {
      return interaction.editReply(`Жалоба **${complaint}** не найдена среди жалоб`);
    }

    db.prepare('DELETE FROM complaints WHERE complaint = ?').run(complaint);

    interaction.editReply(`Жалоба **${complaint}** успешно закрыта.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при закрытии жалобы.');
  }
}

if (interaction.commandName === 'закрыть-мини-жалобу') {
  const complaint = interaction.options.getString('дата');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Мини-Жалобы"
    const resMini = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Мини-Жалобы!A1:B200'
    });

    const miniRows = resMini.data.values || [];

    // Находим строку мини-жалобы
    const linkRowIndex = miniRows.findIndex(r => r[0] && r[0].toString() === complaint);

    // Если мини-жалоба есть — удаляем
    if (linkRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
        range: `Мини-Жалобы!A${linkRowIndex + 1}:B${linkRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', '']] }
      });
    }

    // 2️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    let removed = false;

    // 3️⃣ Ищем мини-жалобу ТОЛЬКО в колонках F–G (индексы 5 и 6)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const colIndex = row.findIndex(
        (v, idx) => (idx === 5 || idx === 6) && v && v.toString() === complaint
      );

      if (colIndex !== -1) {
        const colLetter = String.fromCharCode(65 + colIndex);

        await sheets.spreadsheets.values.update({
          spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
          range: `Статистика!${colLetter}${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['']] }
        });

        removed = true;
        break;
      }
    }

    if (!removed) {
      return interaction.editReply(`Мини‑жалоба **${complaint}** не найдена среди мини‑жалоб`);
    }

    interaction.editReply(`Мини‑жалоба **${complaint}** успешно закрыта.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при закрытии мини‑жалобы.');
  }
}


if (interaction.commandName === 'закрыть-обжалование') {
  const complaint = interaction.options.getString('обжалование');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Обжалования"
    const resAppeals = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Обжалования!A1:B200'
    });

    const appealRows = resAppeals.data.values || [];

    // Находим строку обжалования
    const linkRowIndex = appealRows.findIndex(r => r[0] && r[0].toString() === complaint);

    // Если обжалование есть — удаляем
    if (linkRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
        range: `Обжалования!A${linkRowIndex + 1}:B${linkRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', '']] }
      });
    }

    // 2️⃣ Читаем лист "Статистика"
    const resStats = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:Z200'
    });

    const rows = resStats.data.values || [];

    let removed = false;

    // 3️⃣ Ищем обжалование ТОЛЬКО в колонках H–I (индексы 7 и 8)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const colIndex = row.findIndex(
        (v, idx) => (idx === 7 || idx === 8) && v && v.toString() === complaint
      );

      if (colIndex !== -1) {
        const colLetter = String.fromCharCode(65 + colIndex);

        await sheets.spreadsheets.values.update({
          spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
          range: `Статистика!${colLetter}${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['']] }
        });

        removed = true;
        break;
      }
    }

    if (!removed) {
      return interaction.editReply(`Обжалование **${complaint}** не найдено среди обжалований`);
    }

    interaction.editReply(`Обжалование **${complaint}** успешно закрыто.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при закрытии обжалования.');
  }
}



if (interaction.commandName === 'статистика') {
  await interaction.deferReply();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Статистика!A1:I200'
    });

    const rows = res.data.values;

    if (!rows || rows.length === 0) {
      return interaction.editReply('Таблица пуста.');
    }

    function getRole(rows, rowIndex) {
      if (rows[rowIndex][0] && rows[rowIndex][0].trim() !== '') {
        return rows[rowIndex][0];
      }
      for (let i = rowIndex - 1; i >= 0; i--) {
        if (rows[i][0] && rows[i][0].trim() !== '') {
          return rows[i][0];
        }
      }
      return 'Без роли';
    }

    let stats = [];

    for (let i = 1; i < rows.length; i++) {
      const name = rows[i][1];
      if (!name || name.trim() === '') continue;

      const role = getRole(rows, i);

      const complaints = rows[i].slice(3, 5).filter(v => v && v.trim() !== '').length;
      const miniComplaints = rows[i].slice(5, 7).filter(v => v && v.trim() !== '').length;
      const appeals = rows[i].slice(7, 9).filter(v => v && v.trim() !== '').length;

      stats.push({ role, name, complaints, miniComplaints, appeals });
    }

    stats.sort((a, b) => b.complaints - a.complaints);

    // Формируем embed
    const embed = {
      color: 0x1b37a3,
      title: '📊 Статистика модераторов',
      description: stats
        .map(mod =>
          `**${mod.name}** (${mod.role})\n` +
          `🪓 Жалобы: **${mod.complaints}**\n` +
          `🧩 Мини‑жалобы: **${mod.miniComplaints}**\n` +
          `📥 Обжалования: **${mod.appeals}**\n`
        )
        .join('\n')
    };

    interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка чтения таблицы.');
  }
}



});

  console.log(`Бот запущен как ${client.user.tag}`);
});

syncDatabaseWithSheets(); // запуск при старте
syncAllStats(); // запуск при старте (иначе update* выполнятся только через 6 часов)

async function syncAllStats() {
  const currentMonth = getCurrentMonthName();
  const previousMonth = getPreviousMonthName();

  console.log("Текущий месяц:", currentMonth);
  console.log("Прошлый месяц:", previousMonth || "нет");

  await updateTransitionYearAndMonth(
    '1nEu0IVieDulF6LUuhNMkUvL-P36ago9DU5gHHjS4RkA', // Таблица 1
    'Таблица',
    '1IAgmB8Hy5x8zHWaHYeQy8-t7qBHQ3U9TEWzP99RsUYs', // Таблица 2 (месяцы)
    'Модераторы(Дискорд И Дискорд ID)',
    '10qsQxe5si0xNWhUy4om4ZwD35nX191zCmCSZDHQyzxM', // Таблица 3
    '2026',
    currentMonth
  );

  await updateDate(
    '10qsQxe5si0xNWhUy4om4ZwD35nX191zCmCSZDHQyzxM',
    '1IAgmB8Hy5x8zHWaHYeQy8-t7qBHQ3U9TEWzP99RsUYs'
  );

  await updateActivity(
    '10qsQxe5si0xNWhUy4om4ZwD35nX191zCmCSZDHQyzxM',
    currentMonth
  );

  await updateMain(
    '10qsQxe5si0xNWhUy4om4ZwD35nX191zCmCSZDHQyzxM',
    currentMonth,
    '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA'
  );
}



async function syncDatabaseWithSheets() {
  console.log('🔄 Синхронизация БД с таблицей...');

  // Читаем лист "Жалобы"
  const resComplaints = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
    range: 'Статистика!A1:Z200'
  });

  const complaintsRows = resComplaints.data.values || [];

  // Читаем лист "Ссылки"
  const resLinks = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
    range: 'Жалобы!A1:B200'
  });

  const linksRows = resLinks.data.values || [];

  // Собираем все жалобы из таблицы
  let sheetComplaints = [];

  for (const row of complaintsRows) {
    const moderator = row[1];
    if (!moderator) continue;

    const complaints = row.slice(3).filter(v => v && v.trim() !== '');

    for (const complaint of complaints) {
      const linkRow = linksRows.find(r => r[0] == complaint);
      const url = linkRow ? linkRow[1] : '';

      sheetComplaints.push({
        moderator,
        complaint,
        url
      });
    }
  }

  // Читаем жалобы из БД
  const dbRows = db.prepare('SELECT moderator, complaint, url FROM complaints').all();

  // Добавляем недостающие
  for (const sc of sheetComplaints) {
    const exists = dbRows.find(r => r.complaint == sc.complaint);
    if (!exists) {
      db.prepare(
        'INSERT INTO complaints (moderator, complaint, url) VALUES (?, ?, ?)'
      ).run(sc.moderator, sc.complaint, sc.url);

      console.log(`➕ Добавлено в БД: ${sc.complaint}`);
    }
  }

  // Удаляем лишние
  for (const dbRow of dbRows) {
    const exists = sheetComplaints.find(r => r.complaint == dbRow.complaint);
    if (!exists) {
      db.prepare('DELETE FROM complaints WHERE complaint = ?').run(dbRow.complaint);
      console.log(`❌ Удалено из БД: ${dbRow.complaint}`);
    }
  }

  console.log('✅ Синхронизация завершена.');
}


client.login(process.env.TOKEN);
setInterval(() => {
  syncAllStats(); // внутри уже есть updateTransitionYearAndMonth, updateDate, updateActivity, updateMain
}, 6 * 60 * 60 * 1000);
setInterval(syncDatabaseWithSheets, 6 * 60 * 60 * 1000);
const { REST, Routes } = require('discord.js');
const commands = require('./commands.js');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID, '1538540751590269010'),
      { body: commands }
    );
    console.log('Команды зарегистрированы');
  } catch (error) {
    console.error(error);
  }
})();

async function testRead() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
    range: 'Статистика!A1:E11'
  });

  console.log(res.data.values);
}

testRead();