const { SlashCommandBuilder } = require('discord.js');

module.exports = [

  new SlashCommandBuilder()
    .setName('состав')
    .setDescription('Показать модераторов'),

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
    .setName('внести-мини-жалобу')
    .setDescription('Внести новую мини-жалобу модератору')
    .addStringOption(option =>
      option.setName('логин')
        .setDescription('Логин модератора')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('дата')
        .setDescription('Дата мини-жалобы')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL мини-жалобы')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('внести-обжалование')
    .setDescription('Внести новое обжалование модератору')
    .addStringOption(option =>
      option.setName('логин')
        .setDescription('Логин модератора')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('обжалование')
        .setDescription('Номер обжалования')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL обжалования')
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
    .setName('закрыть-мини-жалобу')
    .setDescription('Закрыть мини-жалобу и удалить её из таблиц')
    .addStringOption(option =>
      option.setName('дата')
        .setDescription('Дата мини-жалобы')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('закрыть-обжалование')
    .setDescription('Закрыть обжалование и удалить его из таблиц')
    .addStringOption(option =>
      option.setName('обжалование')
        .setDescription('Номер обжалования')
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