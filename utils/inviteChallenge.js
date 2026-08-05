const { EmbedBuilder } = require("discord.js");
const db = require("../database/db");

function leaderboard() {
    return db.prepare(
        "SELECT id, invites FROM users ORDER BY invites DESC, id ASC LIMIT 5"
    ).all();
}

function challengeEmbed(challenge) {
    const leaders = leaderboard();
    const podium = leaders.length
        ? leaders.map((user, index) =>
            `${["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][index]} <@${user.id}> — **${user.invites}/${challenge.target}** invites`
        ).join("\n")
        : "No valid invites yet — be the first!";
    const status = challenge.winnerId
        ? `🏆 Winner: <@${challenge.winnerId}>`
        : `⏳ First member to reach **${challenge.target}** valid invites wins.`;

    return new EmbedBuilder()
        .setColor(challenge.winnerId ? 0x57F287 : 0xFEE75C)
        .setTitle("🏆 Invite Race")
        .setDescription(`Invite real friends and climb the leaderboard.\n\n${status}`)
        .addFields(
            { name: "💰 Reward", value: `**${challenge.reward}**`, inline: true },
            { name: "🎯 Goal", value: `**${challenge.target} valid invites**`, inline: true },
            { name: "📈 Leaderboard", value: podium, inline: false }
        )
        .setFooter({ text: "Alt accounts and leave/rejoin farming do not count." });
}

async function refreshInviteChallenge(client) {
    const challenge = db.prepare("SELECT * FROM invite_challenges WHERE id = 1").get();
    if (!challenge) return;

    try {
        const channel = await client.channels.fetch(challenge.channelId);
        const message = await channel.messages.fetch(challenge.messageId);
        await message.edit({ embeds: [challengeEmbed(challenge)] });
    } catch (error) {
        console.error("Unable to refresh invite challenge.", error);
    }
}

async function recordInviteProgress(client, userId, inviteCount) {
    const challenge = db.prepare("SELECT * FROM invite_challenges WHERE id = 1").get();
    if (!challenge) return;

    if (!challenge.winnerId && inviteCount >= challenge.target) {
        const winnerUpdate = db.prepare(
            "UPDATE invite_challenges SET winnerId = ? WHERE id = 1 AND winnerId IS NULL"
        ).run(userId);

        if (winnerUpdate.changes === 1) {
            const channel = await client.channels.fetch(challenge.channelId);
            await channel.send({
                content: `@everyone 🏆 Congratulations <@${userId}>! You reached **${challenge.target} valid invites** first and won **${challenge.reward}**. Please contact staff to claim your reward.`,
                allowedMentions: { parse: ["everyone", "users"] }
            });
        }
    }

    await refreshInviteChallenge(client);
}

async function startInviteChallenge(interaction) {
    const challenge = {
        channelId: interaction.channel.id,
        target: 100,
        reward: "25 SOL",
        winnerId: null
    };
    const message = await interaction.channel.send({
        embeds: [challengeEmbed(challenge)]
    });

    db.prepare(`
        INSERT INTO invite_challenges (id, channelId, messageId, target, reward, winnerId)
        VALUES (1, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
            channelId = excluded.channelId,
            messageId = excluded.messageId,
            target = excluded.target,
            reward = excluded.reward,
            winnerId = NULL
    `).run(challenge.channelId, message.id, challenge.target, challenge.reward);

    return message;
}

module.exports = { recordInviteProgress, startInviteChallenge };
