const sheets = require('./google.js');

async function updateActivity(transitionId, monthSheet) {
  console.log('Начинаю расчёт актива...');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: transitionId,
    range: `${monthSheet}!A1:Z500`
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return;

  const headers = rows[0];

  const colAhelp = headers.indexOf("АХелпы");
  const colTickets = headers.indexOf("Тикеты") !== -1 ? headers.indexOf("Тикеты") : headers.indexOf("Отклики");
  const colComplaints = headers.indexOf("Жалобы");
  const colAppeals = headers.indexOf("Обжалования");
  const colAmnesty = headers.indexOf("Амнистии");
  const colCategory = headers.indexOf("Активность");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const ahelp = Number(row[colAhelp] || 0);
    const tickets = Number(row[colTickets] || 0);
    const complaints = Number(row[colComplaints] || 0);
    const appeals = Number(row[colAppeals] || 0);
    const amnesty = Number(row[colAmnesty] || 0);

    // Главные уровни
    const ahelpHigh = ahelp >= 250;
    const ahelpMid = ahelp >= 100;

    const complaintsHigh = complaints >= 10;
    const complaintsMid = complaints >= 5;

    // Вспомогательные уровни
    const ticketsHigh = tickets >= 15;
    const ticketsMid = tickets >= 5;

    const appealsHigh = appeals >= 10;
    const appealsMid = appeals >= 5;

    const amnestyHigh = amnesty >= 15;
    const amnestyMid = amnesty >= 5;

    const extraHighCount = [ticketsHigh, appealsHigh, amnestyHigh].filter(x => x).length;
    const extraMidCount = [ticketsMid, appealsMid, amnestyMid].filter(x => x).length;

    // Баллы
    const mainScore = ahelp * 0.6 + complaints * 0.4;
    const extraScore = tickets * 0.15 + appeals * 0.05 + amnesty * 0.05;
    const score = mainScore + extraScore;

    let category = "Неактив";

    if (score > 0) {
      // Высокий актив
      if (
        (ahelpHigh && complaintsHigh) ||
        (score >= 1000) ||
        (extraHighCount >= 2 && extraMidCount >= 1) ||
        (complaintsHigh && extraMidCount >= 2) ||
        (ahelpHigh && extraMidCount >= 2)
      ) {
        category = "Высокий";
      }
      // Средний актив
      else if (
        score >= 300 ||
        (ahelpMid && complaintsMid) ||
        (extraHighCount >= 1 && extraMidCount >= 1)
      ) {
        category = "Средний";
      }
      // Низкий актив
      else {
        category = "Низкий";
      }
    }

    row[colCategory] = category;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: transitionId,
    range: `${monthSheet}!A1:Z500`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  console.log("Категории актива обновлены.");
}

module.exports = updateActivity;
