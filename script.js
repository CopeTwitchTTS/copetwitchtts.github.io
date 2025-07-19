let voices = [];
const sentencesForMultilingual = [ "jesus christo", "jesus", "jesus christ", "kys", "thats an l" ];
const blacklistedRegex = [/\s.com+/, /\scom\s+/, /\scom$/, /@[A-Za-z0-9]{8}$/];

let client = undefined;

const AddToQueue = (message) =>
{
    let utterance = new SpeechSynthesisUtterance(message);
    utterance.volume = volume;
    utterance.voice = (sentencesForMultilingual.includes(message.toLowerCase()) && multilingualVoice !== undefined) ? voices[multilingualVoice] : voices[voice];
    synth.speak(utterance);
}

const Play = () =>
{
    if(username === undefined || token === undefined || channel === undefined)
        return;

    if(client !== undefined)
    {
        synth.cancel();
        client.Disconnect();
    } 

    client = new CopeTwitch(
    {
        identity:
        {
            username: username,
            refreshToken: refreshToken,
            token: token
        },
        channel: channel,
        options:
        {
            debug: false
        }
    });
    client.Connect();

    client.On("token_changed", (token) =>
    {
        document.getElementById("tokenInput").value = token;
        localStorage.setItem("en", Encrypt(token, 19));
    });

    client.On("follow", (username, displayName) =>
    {
        if(followNotifications)
            client.Say("anonimsko", `Hey @${username}, thanks for the follow!`);
    });

    client.On("message", (channel, tags, message, self) =>
    {
        const resetRegex = /^\!resetTTS/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] == true)
        {
            AddMessage("#FF1133", "SYSTEM", `${tags["display-name"]} reset the TTS`, "#FF1133")
            Play();
            return;
        }

        blacklistedRegex.forEach(regex =>
        {
            if(message.match(new RegExp(regex)) && tags["mod"] == false)
            {
                client.Ban(tags["user-id"], 30, "The use of a blacklisted phrase");
                return;
            }
        });

        const permissionListRegex = /^\!permissions/;
        if(message.match(new RegExp(permissionListRegex)))
        {
            if(tags["mod"] == false)
            {
                AddMessageWithFlag("#FF8800", "IGNORED", tags["color"], tags["display-name"], message);
                return;
            }

            client.PermissionList(channel);
            AddMessage("#FF1133", "SYSTEM", `${tags["display-name"]} requested a permission list`, "#FF1133");
            return;
        }

        const muteRegex = /^\!mute\s/;
        if(message.match(new RegExp(muteRegex)))
        {
            message = message.replace(muteRegex, "");
            if(excluded.includes(message) === true || tags["mod"] == false)
            {
                AddMessageWithFlag("#FF8800", "IGNORED", tags["color"], tags["display-name"], `!mute ${message}`);
                return;
            }
                
            CreateExcludedButton(message);
            AddMessage("#FF1133", "SYSTEM", `${tags["display-name"]} muted user "${message}"`, "#FF1133");
            return;
        }

        const unmuteRegex = /^\!unmute\s/;
        if(message.match(new RegExp(unmuteRegex)))
        {
            message = message.replace(unmuteRegex, "");
            if(excluded.includes(message) === false || tags["mod"] == false)
            {
                AddMessageWithFlag("#FF8800", "IGNORED", tags["color"], tags["display-name"], `!unmute ${message}`);
                return;
            }

            let tooltipInstance = bootstrap.Tooltip.getInstance(excludedUsersButtons.get(message));
            if (tooltipInstance)
                tooltipInstance.dispose();

            excludedUsersButtons.get(message).remove();
            excludedUsersButtons.delete(message);
            excluded.splice(excluded.indexOf(message), 1);
            localStorage.setItem("excluded", JSON.stringify(excluded));
            AddMessage("#FF1133", "SYSTEM", `${tags["display-name"]} unmuted user "${message}"`, "#FF1133");
            return;
        }

        const silentMessageRegex = /^\!s\s/;
        if(message.match(new RegExp(silentMessageRegex)))
        {
            message = message.replace(silentMessageRegex, "");

            AddMessageWithFlag("#FFEE22", "SILENT", tags["color"], tags["display-name"], `${message}`);
            return;
        }

        const commandsRegex = /^\!/;
        if(message.match(new RegExp(commandsRegex)))
        {
            AddMessageWithFlag("#FF8800", "IGNORED", tags["color"], tags["display-name"], `${message}`);
            return;
        }

        if(excluded.includes(tags["display-name"]))
        {
            AddMessageWithFlag("#FF3333", "MUTED", tags["color"], tags["display-name"], `${message}`);
            return;
        }

        const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if(message.match(new RegExp(linkRegex)))
        {
            message = message.replace(" ", "");
            AddMessageWithLink(tags["color"], tags["display-name"], message);
            AddToQueue(`${tags["display-name"]} sent a link`);
            return;
        }

        AddMessage(tags["color"], tags["display-name"], message);
        AddToQueue(message);
    });
}
document.addEventListener("DOMContentLoaded", Play);


document.getElementById("play").addEventListener("click", Play);


document.getElementById("skip").addEventListener("click", () =>
{
    synth.cancel();
});

document.getElementById("stop").addEventListener("click", () =>
{
    if(client !== undefined)
        client.Disconnect();
    synth.cancel();
});