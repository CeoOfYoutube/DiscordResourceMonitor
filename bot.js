const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const si = require('systeminformation');

// CONFIGURA ESTOS DATOS:
const TOKEN = 'SETHEREBOTTOKEN';
const CLIENT_ID = 'SETHEREBOTID';
const GUILD_ID = 'SETHERESERVERID';
const CHANNEL_ID = 'SETHERECHANNELID';

// ========== REGISTRA COMANDO ==========
const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Displays the server resource statistics'),
];

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ /stats command registered successfully!');
  } catch (error) {
    console.error('Error registering the command:', error);
  }
})();

// ========== BOT ==========
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

let statsMessage = null;

client.once('ready', async () => {
  console.log(`✅ Bot logged as ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  statsMessage = await channel.send({ content: '⏳ Fetching Data...' });

  await updateStats();         
  await updateBotPresence();  

  setInterval(updateStats, 30000);        
  setInterval(updateBotPresence, 30000);  
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stats') {
    const embed = await buildEmbed();
    await interaction.reply({ embeds: [embed] });
  }
});

// ========== FUNCIONES ==========
function bar(percent, length = 20) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function buildEmbed() {
  const [cpu, mem, disk, temp, processes, uptime] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.cpuTemperature(),
    si.processes(),
    si.time()
  ]);

  const cpuLoad = cpu.currentLoad.toFixed(1);
  const ramUsed = (mem.active / 1024 / 1024).toFixed(0);
  const ramTotal = (mem.total / 1024 / 1024).toFixed(0);
  const ramPercent = ((mem.active / mem.total) * 100).toFixed(1);
  const diskUsed = disk[0].used;
  const diskTotal = disk[0].size;
  const diskPercent = ((diskUsed / diskTotal) * 100).toFixed(1);
  const tempC = temp.main || 0;

  const topProcs = processes.list
    .filter(p => p.pcpu > 0.5)
    .sort((a, b) => b.pcpu - a.pcpu)
    .slice(0, 3)
    .map(p => `• ${p.name} (${p.pcpu.toFixed(1)}%)`)
    .join('\n') || 'N/A';

  return new EmbedBuilder()
    .setTitle('📊 Server Resources Usage')
    .addFields(
      { name: `🧠 CPU [${cpuLoad}%]`, value: `\`${bar(cpuLoad)}\``, inline: false },
      { name: `💾 RAM [${ramUsed}MB / ${ramTotal}MB - ${ramPercent}%]`, value: `\`${bar(ramPercent)}\``, inline: false },
      { name: `🗃️ Disk [${(diskUsed / 1e9).toFixed(2)}GB / ${(diskTotal / 1e9).toFixed(2)}GB - ${diskPercent}%]`, value: `\`${bar(diskPercent)}\``, inline: false },
      { name: `🌡️ Temp CPU`, value: `${tempC.toFixed(1)} °C`, inline: true },
      { name: `⚙️ Main processes`, value: topProcs, inline: false },
      { name: `⏱️ Uptime`, value: `${(uptime.uptime / 3600).toFixed(1)} horas`, inline: true }
    )
    .setColor(0x00bfff)
    .setTimestamp();
}

async function updateStats() {
  const embed = await buildEmbed();
  if (statsMessage) {
    await statsMessage.edit({ content: null, embeds: [embed] });
  }
}

async function updateBotPresence() {
  try {
    const [cpu, mem] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);

    const cpuLoad = cpu.currentLoad.toFixed(1);
    const ramUsed = (mem.active / 1024 / 1024).toFixed(0);
    const ramTotal = (mem.total / 1024 / 1024).toFixed(0);

    const status = `RAM: ${ramUsed}/${ramTotal} MB | CPU: ${cpuLoad}%`;

    client.user.setActivity(status, { type: 3 }); // Jugando a...
    console.log(`✅ RPC Updated succesfully: ${status}`);
  } catch (err) {
    console.error('❌ Error updating the RPC:', err);
  }
}

client.login(TOKEN);

