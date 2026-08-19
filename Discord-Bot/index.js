require('dotenv').config();
const db = require('./db');
const sheets = require('./google.js');
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('clientReady', () => {
    client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === 'статистика-модератора') {
  const login = interaction.options.getString('логин');
  await interaction.deferReply();

  try {
    console.log('Начало обработки статистики модератора');

    // Читаем основной лист с жалобами
    const resComplaints = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:E200'
    });

    // Читаем лист со ссылками
    const resLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Ссылки!A1:B200'
    });

    const rows = resComplaints.data.values || [];
    const linksRows = resLinks.data.values || [];

    console.log('Данные получены:', rows.length);

    const modRow = rows.find(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (!modRow) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    // Находим индекс строки модератора (ОБЪЯВЛЯЕМ ОДИН РАЗ)
    const rowIndex = rows.indexOf(modRow);

    // Читаем лист с форматированием (для цвета)
    const sheetData = await sheets.spreadsheets.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      ranges: ['Жалобы!A1:E200'],
      includeGridData: true
    });

    const grid = sheetData.data.sheets[0].data[0].rowData;

    // Цвет ячейки с именем (колонка B = индекс 1)
    const cell = grid[rowIndex]?.values?.[2];
    const color = cell?.effectiveFormat?.backgroundColor || {};

    // Определяем статус по цвету
    let active = 'Неизвестно';

   function isGreen(c) {
  return (
    c.red   > 0.50 && c.red   < 0.65 &&
    c.green > 0.70 && c.green < 0.80 &&
    c.blue  > 0.45 && c.blue  < 0.55
  );
}

function isRed(c) {
  return (
    c.red   > 0.80 && c.red   < 0.95 &&
    c.green > 0.35 && c.green < 0.45 &&
    c.blue  > 0.35 && c.blue < 0.45
  );
}

if (isGreen(color)) active = 'Да';
else if (isRed(color)) active = 'Нет';


    // --- Определяем ранг (учёт merge cells) ---
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

    // --- Список жалоб ---
    const rawComplaints = modRow.slice(3).filter(v => v && v.toString().trim() !== '');

    const complaintLinks =
      rawComplaints.length === 0
        ? 'Нет жалоб'
        : rawComplaints
            .map(num => {
              const linkRow = linksRows.find(r => r[0] && r[0].toString() === num.toString());
              if (linkRow && linkRow[1]) {
                const url = linkRow[1];
                return `[${num}](${url})`;
              }
              return num.toString();
            })
            .join(', ');

    const name = modRow[1];
    const complaintsCount = rawComplaints.length;

    // --- EMBED ---
    const embed = {
      color: 0x1b37a3,
      title: name,
      description:
        `🌀 **Ранг:** ${role}\n\n` +
        `🪓 **Жалобы:** ${complaintsCount}\n\n` +
        `🔒 **Работает:** ${active}\n\n` +
        `**Список жалоб:**\n${complaintLinks}`
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
    // 1️⃣ Читаем лист "Ссылки"
    const resLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Ссылки!A1:B200'
    });

    const linksRows = resLinks.data.values || [];

    // Находим первую пустую строку
    const emptyRowIndex = linksRows.findIndex(r => !r[0] && !r[1]);
    const rowToWrite = emptyRowIndex === -1 ? linksRows.length + 1 : emptyRowIndex + 1;

    // Записываем жалобу в лист "Ссылки"
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Ссылки!A${rowToWrite}:B${rowToWrite}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[complaint, url]] }
    });

    // 2️⃣ Ждём 5 секунд
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3️⃣ Читаем лист "Жалобы"
    const resComplaints = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:Z200'
    });

    const rows = resComplaints.data.values || [];

    // Находим модератора
    const modRowIndex = rows.findIndex(r => r[1] && r[1].toLowerCase() === login.toLowerCase());
    if (modRowIndex === -1) {
      return interaction.editReply(`Модератор **${login}** не найден.`);
    }

    const modRow = rows[modRowIndex];

    // гарантируем, что строка имеет хотя бы 4 колонки (A,B,C,D)
    while (modRow.length < 4) {
      modRow.push('');
    }

    // ищем первую пустую ячейку начиная с D (индекс 3)
    let colIndex = modRow.findIndex((v, i) => i >= 3 && (!v || v.trim() === ''));

    // если не нашли — добавляем в конец
    if (colIndex === -1) {
      colIndex = modRow.length;
    }

    const colLetter = String.fromCharCode(65 + colIndex);

    // 4️⃣ Вставляем формулу HYPERLINK прямо ботом
    await sheets.spreadsheets.values.update({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: `Жалобы!${colLetter}${modRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[`=HYPERLINK("${url}"; "${complaint}")`]]
      }
    });

    db.prepare(
        'INSERT INTO complaints (moderator, complaint, url) VALUES (?, ?, ?)'
        ).run(login, complaint, url);


    interaction.editReply(`Жалоба **${complaint}** успешно внесена модератору **${login}**.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при внесении жалобы.');
  }
}

if (interaction.commandName === 'закрыть-жалобу') {
  const complaint = interaction.options.getString('жалоба');

  await interaction.deferReply();

  try {
    // 1️⃣ Читаем лист "Ссылки"
    const resLinks = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Ссылки!A1:B200'
    });

    const linksRows = resLinks.data.values || [];

    // Находим строку жалобы
    const linkRowIndex = linksRows.findIndex(r => r[0] && r[0].toString() === complaint);

    // Если жалоба есть в листе "Ссылки" — удаляем
    if (linkRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
        range: `Ссылки!A${linkRowIndex + 1}:B${linkRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', '']] }
      });
    }

    // 2️⃣ Читаем лист "Жалобы"
    const resComplaints = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:Z200'
    });

    const rows = resComplaints.data.values || [];

    let removed = false;

    // 3️⃣ Ищем жалобу у модератора
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // ищем жалобу начиная с колонки D (индекс 3)
      const colIndex = row.findIndex((v, idx) => idx >= 3 && v && v.toString() === complaint);

      if (colIndex !== -1) {
        const colLetter = String.fromCharCode(65 + colIndex);

        // очищаем ячейку (удаляем формулу или текст)
        await sheets.spreadsheets.values.update({
          spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
          range: `Жалобы!${colLetter}${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['']] }
        });

        removed = true;
        break;
      }
    }

    if (!removed) {
      return interaction.editReply(`Жалоба **${complaint}** не найдена.`);
    }

    db.prepare('DELETE FROM complaints WHERE complaint = ?').run(complaint);

    interaction.editReply(`Жалоба **${complaint}** успешно закрыта.`);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка при закрытии жалобы.');
  }
}



if (interaction.commandName === 'статистика') {
  await interaction.deferReply();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
      range: 'Жалобы!A1:E200'
    });

    const rows = res.data.values;

    if (!rows || rows.length === 0) {
      return interaction.editReply('Таблица пуста.');
    }

    // Функция для получения ранга с учётом merge
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
      const name = rows[i][1] || 'Без имени';
      if (!name || name.trim() === '') continue;

      const role = getRole(rows, i);

      const complaints = rows[i]
        .slice(3)
        .filter(v => v && v.toString().trim() !== '')
        .length;

      stats.push({ role, name, complaints });
    }

    stats.sort((a, b) => b.complaints - a.complaints);

    let text = '**📊 Статистика модераторов:**\n\n';
    for (const mod of stats) {
      text += `\`${mod.name}\` (${mod.role}) — ${mod.complaints} жалоб\n`;
    }

    interaction.editReply(text);

  } catch (err) {
    console.error(err);
    interaction.editReply('Ошибка чтения таблицы.');
  }
}


});

  console.log(`Бот запущен как ${client.user.tag}`);
});

syncDatabaseWithSheets(); // запуск при старте


async function syncDatabaseWithSheets() {
  console.log('🔄 Синхронизация БД с таблицей...');

  // Читаем лист "Жалобы"
  const resComplaints = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
    range: 'Жалобы!A1:Z200'
  });

  const complaintsRows = resComplaints.data.values || [];

  // Читаем лист "Ссылки"
  const resLinks = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QRlQ0HHhejP0I0dY_IYejXhsn_Ac0Wi189gq4l_qQVA',
    range: 'Ссылки!A1:B200'
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
setInterval(syncDatabaseWithSheets, 6 * 60 * 60 * 1000); // каждые 6 часов
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
    range: 'Жалобы!A1:E11'
  });

  console.log(res.data.values);
}

testRead();

