import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================
//   إعدادات البوت - Bot Configuration
// =============================================
const config = {
  token: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  prefix: '!',
  welcomeChannelName: 'الترحيب',
  logChannelName: 'سجل-الأحداث',
  ticketCategoryName: 'التذاكر',
  colors: {
    success: 0x57F287,
    error: 0xED4245,
    warning: 0xFEE75C,
    info: 0x5865F2,
    default: 0x2B2D31,
  },
};

// =============================================
//   إنشاء العميل - Create Client
// =============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.tickets = new Map();

// =============================================
//   الأوامر المدمجة - Built-in Commands
// =============================================
const commands = {
  // أمر المساعدة
  help: {
    name: 'help',
    description: 'عرض قائمة الأوامر',
    execute: async (message) => {
      const embed = new EmbedBuilder()
        .setTitle('📋 قائمة الأوامر')
        .setColor(config.colors.info)
        .setDescription('هنا جميع الأوامر المتاحة:')
        .addFields(
          { name: '🛡️ الإشراف', value: '`!kick` `!ban` `!mute` `!unmute` `!clear`', inline: false },
          { name: '🎫 التذاكر', value: '`!ticket` — فتح تذكرة دعم', inline: false },
          { name: '📊 معلومات', value: '`!userinfo` `!serverinfo` `!ping`', inline: false },
          { name: '🎉 ترفيه', value: '`!8ball` `!roll`', inline: false },
        )
        .setFooter({ text: `البادئة: ${config.prefix}` })
        .setTimestamp();
      message.reply({ embeds: [embed] });
    },
  },

  // أمر البينغ
  ping: {
    name: 'ping',
    description: 'فحص سرعة البوت',
    execute: async (message) => {
      const sent = await message.reply('⏳ جاري القياس...');
      const ping = sent.createdTimestamp - message.createdTimestamp;
      const embed = new EmbedBuilder()
        .setTitle('🏓 بونج!')
        .setColor(ping < 100 ? config.colors.success : ping < 300 ? config.colors.warning : config.colors.error)
        .addFields(
          { name: '📡 زمن الاستجابة', value: `\`${ping}ms\``, inline: true },
          { name: '💓 نبضة API', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
        )
        .setTimestamp();
      sent.edit({ content: '', embeds: [embed] });
    },
  },

  // معلومات المستخدم
  userinfo: {
    name: 'userinfo',
    description: 'عرض معلومات مستخدم',
    execute: async (message, args) => {
      const member = message.mentions.members.first() || message.member;
      const user = member.user;
      const embed = new EmbedBuilder()
        .setTitle(`👤 معلومات ${user.username}`)
        .setColor(config.colors.info)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 المعرف', value: `\`${user.id}\``, inline: true },
          { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '📥 تاريخ الانضمام', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: '🎭 الأدوار', value: member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ') || 'لا يوجد', inline: false },
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    },
  },

  // معلومات السيرفر
  serverinfo: {
    name: 'serverinfo',
    description: 'عرض معلومات السيرفر',
    execute: async (message) => {
      const guild = message.guild;
      const embed = new EmbedBuilder()
        .setTitle(`🏠 ${guild.name}`)
        .setColor(config.colors.info)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '🆔 المعرف', value: `\`${guild.id}\``, inline: true },
          { name: '👑 المالك', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 الأعضاء', value: `${guild.memberCount}`, inline: true },
          { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '📁 القنوات', value: `${guild.channels.cache.size}`, inline: true },
          { name: '🎭 الأدوار', value: `${guild.roles.cache.size}`, inline: true },
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    },
  },

  // أمر الكيك (طرد)
  kick: {
    name: 'kick',
    description: 'طرد عضو من السيرفر',
    execute: async (message, args) => {
      if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return message.reply({ embeds: [errorEmbed('ليس لديك صلاحية الطرد!')] });
      }
      const member = message.mentions.members.first();
      if (!member) return message.reply({ embeds: [errorEmbed('يرجى تحديد العضو!')] });
      if (!member.kickable) return message.reply({ embeds: [errorEmbed('لا أستطيع طرد هذا العضو!')] });
      const reason = args.slice(1).join(' ') || 'لم يتم تحديد سبب';
      await member.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle('👢 تم الطرد')
        .setColor(config.colors.warning)
        .addFields(
          { name: '👤 العضو', value: member.user.tag, inline: true },
          { name: '🔨 بواسطة', value: message.author.tag, inline: true },
          { name: '📝 السبب', value: reason, inline: false },
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
      logAction(message.guild, 'kick', member.user, message.author, reason);
    },
  },

  // أمر البان (حظر)
  ban: {
    name: 'ban',
    description: 'حظر عضو من السيرفر',
    execute: async (message, args) => {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply({ embeds: [errorEmbed('ليس لديك صلاحية الحظر!')] });
      }
      const member = message.mentions.members.first();
      if (!member) return message.reply({ embeds: [errorEmbed('يرجى تحديد العضو!')] });
      if (!member.bannable) return message.reply({ embeds: [errorEmbed('لا أستطيع حظر هذا العضو!')] });
      const reason = args.slice(1).join(' ') || 'لم يتم تحديد سبب';
      await member.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle('🔨 تم الحظر')
        .setColor(config.colors.error)
        .addFields(
          { name: '👤 العضو', value: member.user.tag, inline: true },
          { name: '🔨 بواسطة', value: message.author.tag, inline: true },
          { name: '📝 السبب', value: reason, inline: false },
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
      logAction(message.guild, 'ban', member.user, message.author, reason);
    },
  },

  // أمر الميوت (كتم)
  mute: {
    name: 'mute',
    description: 'كتم عضو',
    execute: async (message, args) => {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply({ embeds: [errorEmbed('ليس لديك صلاحية الكتم!')] });
      }
      const member = message.mentions.members.first();
      if (!member) return message.reply({ embeds: [errorEmbed('يرجى تحديد العضو!')] });
      const duration = parseInt(args[1]) || 10;
      await member.timeout(duration * 60 * 1000, args.slice(2).join(' ') || 'لم يتم تحديد سبب');
      const embed = new EmbedBuilder()
        .setTitle('🔇 تم الكتم')
        .setColor(config.colors.warning)
        .addFields(
          { name: '👤 العضو', value: member.user.tag, inline: true },
          { name: '⏱️ المدة', value: `${duration} دقيقة`, inline: true },
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    },
  },

  // مسح الرسائل
  clear: {
    name: 'clear',
    description: 'مسح عدد من الرسائل',
    execute: async (message, args) => {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply({ embeds: [errorEmbed('ليس لديك صلاحية مسح الرسائل!')] });
      }
      const amount = parseInt(args[0]);
      if (!amount || amount < 1 || amount > 100) {
        return message.reply({ embeds: [errorEmbed('يرجى تحديد عدد بين 1 و 100!')] });
      }
      await message.channel.bulkDelete(amount + 1, true);
      const msg = await message.channel.send({ embeds: [successEmbed(`تم مسح ${amount} رسالة`)] });
      setTimeout(() => msg.delete().catch(() => {}), 3000);
    },
  },

  // فتح تذكرة
  ticket: {
    name: 'ticket',
    description: 'فتح تذكرة دعم',
    execute: async (message, args) => {
      const reason = args.join(' ') || 'طلب دعم عام';
      const category = message.guild.channels.cache.find(c => c.name === config.ticketCategoryName && c.type === ChannelType.GuildCategory);
      const ticketChannel = await message.guild.channels.create({
        name: `تذكرة-${message.author.username}`,
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: [
          { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      const embed = new EmbedBuilder()
        .setTitle('🎫 تذكرة دعم جديدة')
        .setColor(config.colors.info)
        .setDescription(`مرحباً <@${message.author.id}>!\nتذكرتك مفتوحة. سيتواصل معك فريق الدعم قريباً.`)
        .addFields({ name: '📝 الموضوع', value: reason })
        .setTimestamp();

      ticketChannel.send({ embeds: [embed], components: [closeButton] });
      message.reply({ embeds: [successEmbed(`تم فتح تذكرتك: ${ticketChannel}`)] });
      client.tickets.set(ticketChannel.id, message.author.id);
    },
  },

  // كرة 8 السحرية
  '8ball': {
    name: '8ball',
    description: 'اسأل كرة 8 السحرية',
    execute: async (message, args) => {
      const answers = ['نعم بالتأكيد!', 'لا شك في ذلك!', 'ربما...', 'لا أعتقد!', 'بالتأكيد لا!', 'الإجابة غامضة، حاول لاحقاً', 'توقعاتي إيجابية!', 'الأمور لا تبدو جيدة..'];
      const question = args.join(' ');
      if (!question) return message.reply({ embeds: [errorEmbed('يرجى طرح سؤال!')] });
      const answer = answers[Math.floor(Math.random() * answers.length)];
      const embed = new EmbedBuilder()
        .setTitle('🎱 كرة 8 السحرية')
        .setColor(config.colors.default)
        .addFields(
          { name: '❓ السؤال', value: question },
          { name: '🔮 الإجابة', value: answer },
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    },
  },

  // رمي النرد
  roll: {
    name: 'roll',
    description: 'رمي النرد',
    execute: async (message, args) => {
      const max = parseInt(args[0]) || 6;
      const result = Math.floor(Math.random() * max) + 1;
      const embed = new EmbedBuilder()
        .setTitle('🎲 رمي النرد')
        .setColor(config.colors.info)
        .setDescription(`النتيجة: **${result}** من ${max}`)
        .setTimestamp();
      message.reply({ embeds: [embed] });
    },
  },
};

// =============================================
//   دوال مساعدة - Helper Functions
// =============================================
function errorEmbed(msg) {
  return new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ ${msg}`);
}

function successEmbed(msg) {
  return new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ ${msg}`);
}

async function logAction(guild, action, targetUser, moderator, reason = 'لم يتم تحديد سبب') {
  const logChannel = guild.channels.cache.find(c => c.name === config.logChannelName);
  if (!logChannel) return;
  const actionNames = { kick: '👢 طرد', ban: '🔨 حظر', mute: '🔇 كتم', unban: '✅ رفع الحظر' };
  const embed = new EmbedBuilder()
    .setTitle(actionNames[action] || action)
    .setColor(action === 'ban' ? config.colors.error : config.colors.warning)
    .addFields(
      { name: '👤 المستهدف', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: '🛡️ المشرف', value: moderator.tag, inline: true },
      { name: '📝 السبب', value: reason, inline: false },
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] });
}

// =============================================
//   أحداث البوت - Bot Events
// =============================================

// عند الاتصال
client.once('ready', () => {
  console.log(`✅ البوت جاهز! مسجل دخول بـ ${client.user.tag}`);
  client.user.setActivity('!help | يخدم سيرفرك', { type: 3 });
});

// ترحيب بالأعضاء الجدد
client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.find(c => c.name === config.welcomeChannelName);
  if (!welcomeChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`👋 مرحباً بك في ${member.guild.name}!`)
    .setColor(config.colors.success)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setDescription(`أهلاً وسهلاً <@${member.user.id}>!\nأنت العضو رقم **${member.guild.memberCount}** 🎉`)
    .addFields(
      { name: '📜 القواعد', value: 'تأكد من قراءة قواعد السيرفر', inline: true },
      { name: '🎫 الدعم', value: 'اكتب `!ticket` لفتح تذكرة', inline: true },
    )
    .setTimestamp();

  welcomeChannel.send({ embeds: [embed] });
});

// وداع للأعضاء المغادرين
client.on('guildMemberRemove', async (member) => {
  const logChannel = member.guild.channels.cache.find(c => c.name === config.logChannelName);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle('👋 عضو غادر السيرفر')
    .setColor(config.colors.warning)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag} (${member.user.id})`, inline: true },
      { name: '📅 انضم', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] });
});

// معالجة الأوامر
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = commands[commandName];
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`خطأ في الأمر ${commandName}:`, err);
    message.reply({ embeds: [errorEmbed('حدث خطأ غير متوقع!')] });
  }
});

// معالجة أزرار التذكرة
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'close_ticket') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'ليس لديك صلاحية إغلاق التذاكر!', ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed('سيتم إغلاق هذه التذكرة خلال 5 ثوانٍ...')] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// سجل رفع الحظر
client.on('guildBanRemove', async (ban) => {
  const logChannel = ban.guild.channels.cache.find(c => c.name === config.logChannelName);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle('✅ رفع الحظر')
    .setColor(config.colors.success)
    .addFields({ name: '👤 المستخدم', value: `${ban.user.tag}` })
    .setTimestamp();
  logChannel.send({ embeds: [embed] });
});

// =============================================
//   تشغيل البوت - Start Bot
// =============================================
client.login(config.token).catch(err => {
  console.error('❌ فشل تسجيل الدخول! تأكد من صحة التوكن:', err.message);
  process.exit(1);
});
