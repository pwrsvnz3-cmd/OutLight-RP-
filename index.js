const {
  Client,
  GatewayIntentBits,
  Partials,
  AttachmentBuilder,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const path = require("path");
const config = require("./config");
const { buildTicketPanel, handleTicketInteraction } = require("./ticket");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ---------- سلاش كوماند ----------
const commands = [
  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("إرسال لوحة فتح التذاكر في هذه القناة (للإدارة فقط)"),
].map((c) => c.toJSON());

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} شغال الحين | ${config.SERVER_NAME}`);

  try {
    const rest = new REST({ version: "10" }).setToken(config.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ تم تسجيل الأوامر (Slash Commands)");
  } catch (err) {
    console.error("❌ خطأ في تسجيل الأوامر:", err);
  }
});

// ---------- بوت الترحيب ----------
client.on("guildMemberAdd", async (member) => {
  try {
    const channel = member.guild.channels.cache.get(
      config.WELCOME_CHANNEL_ID
    );
    if (!channel) return;

    const bannerPath = path.join(__dirname, "assets", "banner.png");
    const avatarPath = path.join(__dirname, "assets", "avatar.png");

    const bannerAttachment = new AttachmentBuilder(bannerPath, {
      name: "banner.png",
    });
    const avatarAttachment = new AttachmentBuilder(avatarPath, {
      name: "avatar.png",
    });

    const embed = new EmbedBuilder()
      .setColor(config.BRAND_COLOR)
      .setAuthor({
        name: config.SERVER_NAME,
        iconURL: "attachment://avatar.png",
      })
      .setTitle(`أهلاً وسهلاً بك، ${member.user.username} 👋`)
      .setDescription(
        `مرحباً بك في **${config.SERVER_NAME}**!\n` +
          `أنت العضو رقم **${member.guild.memberCount}** في السيرفر.\n\n` +
          `📜 لا تنسى تقرأ القوانين\n` +
          `📝 قدّم طلب الـ Whitelist إذا ما سويته\n` +
          `🎭 استمتع بتجربة رول بلاي احترافية معنا`
      )
      .setImage("attachment://banner.png")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: config.SERVER_NAME })
      .setTimestamp();

    await channel.send({
      content: `${member} 🌙`,
      embeds: [embed],
      files: [bannerAttachment, avatarAttachment],
    });
  } catch (err) {
    console.error("❌ خطأ في رسالة الترحيب:", err);
  }
});

// ---------- التفاعل مع الأزرار والأوامر ----------
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ticket-setup") {
        if (!interaction.memberPermissions.has("ManageGuild")) {
          return interaction.reply({
            content: "❌ ما عندك صلاحية تستخدم هذا الأمر.",
            ephemeral: true,
          });
        }
        await buildTicketPanel(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      await handleTicketInteraction(interaction);
    }
  } catch (err) {
    console.error("❌ خطأ في التفاعل:", err);
  }
});

client.login(config.TOKEN);
