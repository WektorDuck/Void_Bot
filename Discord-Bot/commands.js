const { SlashCommandBuilder } = require('discord.js');

module.exports = [

  new SlashCommandBuilder()
    .setName('статистика')
    .setDescription('Показать статистику модераторов'),

  new SlashCommandBuilder()
    .setName('просмотр-бд')
    .setDescription('Показать содержимое локальной базы данных жалоб'),

  new SlashCommandBuilder()
    .setName('внести-жалобу')
    .setDescription('Внести новую жалобу модератору')
    .addStringOption(option =>
      option.setName('логин')
        .setDescription('Логин модератора')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('жалоба')
        .setDescription('Номер жалобы')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL жалобы')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('закрыть-жалобу')
    .setDescription('Закрыть жалобу и удалить её из таблиц')
    .addStringOption(option =>
      option.setName('жалоба')
        .setDescription('Номер жалобы')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('статистика-модератора')
    .setDescription('Показать статистику конкретного модератора')
    .addStringOption(option =>
      option.setName('логин')
        .setDescription('Логин модератора')
        .setRequired(true)
    )

];