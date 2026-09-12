const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
  ChannelType,
} = require("discord.js");
const path = require("path");
const config = require("./config");

// ---------- إرسال لوحة فتح التذاكر ----------
async function buildTicketPanel(interaction) {
  const bannerPath = path.join(__dirname, "assets", "banner.png");
  const bannerAttachment = new AttachmentBuilder(bannerPath, {
    name: "banner.png",
  });

  const embed = new EmbedBuilder()
    .setColor(config.BRAND_COLOR)
    .setTitle(`🎫 نظام التذاكر | ${config.SERVER_NAME}`)
    .setDescription(
      "إذا عندك استفسار، مشكلة، أو تبي تبلغ عن شيء معين:\n" +
        "اضغط الزر تحت وبتنفتح لك تذكرة خاصة يشوفها فريق الدعم فقط."
    )
    .setImage("attachment://banner.png")
    .setFooter({ text: config.SERVER_NAME });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("📩 فتح تذكرة")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.channel.send({
    embeds: [embed],
    files: [bannerAttachment],
    components: [row],
  });

  await interaction.reply({
    content: "✅ تم إرسال لوحة التذاكر.",
    ephemeral: true,
  });
}

// ---------- التعامل مع أزرار التذاكر ----------
async function handleTicketInteraction(interaction) {
  const { customId, guild, user, member } = interaction;

  // فتح تذكرة جديدة
  if (customId === "open_ticket") {
    const existing = guild.channels.cache.find(
      (c) => c.name === `ticket-${user.username.toLowerCase()}`
    );
    if (existing) {
      return interaction.reply({
        content: `❌ عندك تذكرة مفتوحة بالفعل: ${existing}`,
        ephemeral: true,
      });
    }

    const overwrites = [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (config.SUPPORT_ROLE_ID && config.SUPPORT_ROLE_ID !== "ضع_ايدي_رتبة_الدعم") {
      overwrites.push({
        id: config.SUPPORT_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent:
        config.TICKET_CATEGORY_ID !== "ضع_ايدي_الكاتيقوري_اللي_تنفتح_فيها_التذاكر"
          ? config.TICKET_CATEGORY_ID
          : null,
      permissionOverwrites: overwrites,
    });

    const embed = new EmbedBuilder()
      .setColor(config.BRAND_COLOR)
      .setTitle("🎫 تذكرة جديدة")
      .setDescription(
        `مرحباً ${user}، فريق الدعم بيوصلك قريباً.\n` +
          "اشرح مشكلتك أو طلبك هنا بالتفصيل."
      )
      .setFooter({ text: config.SERVER_NAME })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 إغلاق التذكرة")
        .setStyle(ButtonStyle.Danger)
    );

    const supportMention =
      config.SUPPORT_ROLE_ID !== "ضع_ايدي_رتبة_الدعم"
        ? `<@&${config.SUPPORT_ROLE_ID}>`
        : "";

    await channel.send({
      content: `${user} ${supportMention}`,
      embeds: [embed],
      components: [closeRow],
    });

    return interaction.reply({
      content: `✅ تم فتح تذكرتك: ${channel}`,
      ephemeral: true,
    });
  }

  // إغلاق التذكرة
  if (customId === "close_ticket") {
    await interaction.reply({
      content: "🔒 راح يتم إغلاق التذكرة خلال 5 ثواني...",
    });

    const logChannel = guild.channels.cache.get(config.TICKET_LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send({
        content: `📁 تم إغلاق تذكرة **${interaction.channel.name}** بواسطة ${member}.`,
      });
    }

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
}

module.exports = { buildTicketPanel, handleTicketInteraction };
