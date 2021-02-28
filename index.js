const config = require("./config.json");
const Eris = require('eris');
const Erelajs = require("erela.js");

const bot = new Eris(config.token);
const Manager = new Erelajs.Manager({
    nodes: [
        {
            host: "localhost",
            port: 4321,
            password: "youshallnotpass"
        }
    ],
    send(id, payload) {
        const guild = bot.guilds.get(id);
        if(guild) {
            guild.shard.sendWS(payload.op, payload.d);
        }
    }
})

bot.on("ready", () => {
    console.log(`Bot is ready!`)
    Manager.init(bot.user.id);
})
bot.on('rawWS', (d) => Manager.updateVoiceState(d));
Manager.on("nodeConnect", (node) => {
    console.log(`Connected to: ${node.options.identifier}`);
})

Manager.on("trackStart", (player, track) => {
    bot.createMessage(player.textChannel, { embed: { title: "Now Playing", description: `Playing: [${track.title}](${track.uri})`}});
})

bot.on("messageCreate", async(message) => {
    if(message.author.bot) return;
    let prefix = "!";

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if(cmd == "play" || cmd == 'p') {
        const channel = message.member.voiceState.channelID;
        if(!channel) return bot.createMessage(message.channel.id, "You should be in voice channel if you want to listen songs.");

        let res;
        let search = args.join(" ");
        if(!search) return bot.createMessage(message.channel.id, "Invalid command. Try `!play <Song Name|URL>`");

        const player = Manager.create({
            guild: message.guildID,
            voiceChannel: channel,
            textChannel: message.channel.id,
            selfDeafen: true
        });

        if(player.state != 'CONNECTED') await player.connect();

        res = await player.search(search, message.author)
    
        if(res.loadType == 'NO_MATCHES') {
            return bot.createMessage(message.channel.id, `No Match found!`)
        } else if(res.loadType == 'PLAYLIST_LOADED') {
            player.queue.add(res.tracks);
            if(!player.playing || !player.paused || player.queue.totalSize === res.tracks.length) {
                player.play()
            }
        } else {
            player.queue.add(res.tracks[0]);
            if(!player.playing || !player.paused || player.queue.size) {
                player.play()
            }
        }
    } else if(cmd == 'next' || cmd == 'skip') {
        const channel = message.member.voiceState.channelID;
        if(!channel) return bot.createMessage(message.channel.id, "You should be in voice channel if you want to listen songs.");

        const player = await Manager.get(message.guildID);
        if(!player) {
            return bot.createMessage(message.channel.id, "No song playing...")
        }
        
        player.stop();
        return bot.createMessage(message.channel.id, "Skipped the song!")
    }

})


bot.connect();
