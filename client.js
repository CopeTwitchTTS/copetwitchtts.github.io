const synth = window.speechSynthesis;

let voices;
let voice = undefined;
let multilingualVoice = undefined;
let sentencesForMultilingual = [ "jesus christo", "jesus", "jesus christ", "kys", "thats an L" ];
let channel = undefined;
let volume = 0.5;
let excluded = [];
let excludedButtons = [];
let client = undefined;

let loadSavedSettings = () =>
{
    if(localStorage.getItem("channel") !== null)
    {
        channel = localStorage.getItem("channel");
        document.getElementById("channel").value = channel;
    }
    if(localStorage.getItem("volume") !== null)
    {
        volume = localStorage.getItem("volume");
        document.getElementById("volume").value = volume * 100;
    }
    if(localStorage.getItem("excluded") !== null)
    {
        JSON.parse(localStorage.getItem("excluded")).forEach((item, index) =>
        {
            createExcludedButton(item);
        });
    }
}
loadSavedSettings();

let clearSelect = (element) =>
{
    for(let i = element.options.length - 1; i >= 0; i--)
        element.remove(i);
}

synth.onvoiceschanged = () =>
{
    voices = synth.getVoices();
    let voicesList = document.getElementById("voiceList");
    clearSelect(voicesList);

    voice = undefined;
    multilingualVoice = undefined;

    voices.forEach((item, index) =>
    {
        let option = document.createElement("option");
        option.text = `${item.name} (${item.lang})`;
        option.value = index;

        if(item.name == localStorage.getItem("voice") && voice === undefined)
        {
            option.selected = true;
            voice = index;
        }

        if(item.name == "Microsoft AvaMultilingual Online (Natural) - English (United States)" && multilingualVoice === undefined)
            multilingualVoice = index;

        voicesList.add(option);
    });

    if(voice === undefined)
    {
        voicesList.value = 0;
        voice = 0;
    }
}

document.getElementById("voiceList").addEventListener("change", (e) =>
{
    voice = e.currentTarget.value;
    localStorage.setItem("voice", voices[voice].name);
});

document.getElementById("channel").addEventListener("change", (e) =>
{
    channel = e.currentTarget.value;
    localStorage.setItem("channel", channel);
});

document.getElementById("volume").addEventListener("change", (e) =>
{
    volume = e.currentTarget.value / 100;
    localStorage.setItem("volume", volume);
});

let play = () =>
{   
    if(channel === undefined)
        return;

    if(client !== undefined)
    {
        synth.cancel();
        client.disconnect();
    } 

    client = new tmi.Client(
    {
        connection:
        {
            secure: true,
            reconnect: true
        },
        channels: [ channel ]
    });
    client.connect();

    client.on("message", (channel, tags, message, self) =>
    {
        const resetRegex = /^\!resetTTS/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] === true)
        {
            addCustomMessageToChatHistory(`${tags["display-name"]} reset the TTS`);
            play();
            return;
        }

        const muteRegex = /^\!mute\s/;
        if(message.match(new RegExp(muteRegex)) && tags["mod"] === true)
        {
            message = message.replace(muteRegex, "");
            if(message == "Anonimsko" || excluded.includes(message))
                return;

            createExcludedButton(message);
            addCustomMessageToChatHistory(`${tags["display-name"]} muted user "${message}"`);
            return;
        }

        const unmuteRegex = /^\!unmute\s/;
        if(message.match(new RegExp(unmuteRegex)) && tags["mod"] === true)
        {
            message = message.replace(unmuteRegex, "");
            if(!excluded.includes(message))
                return;

            let tooltipInstance = bootstrap.Tooltip.getInstance(excludedButtons[excluded.indexOf(message)]);
            if (tooltipInstance)
                tooltipInstance.dispose();

            excludedButtons[excluded.indexOf(message)].remove();
            excludedButtons.splice(excluded.indexOf(message), 1);
            excluded.splice(excluded.indexOf(message), 1);
            localStorage.setItem("excluded", JSON.stringify(excluded));
            addCustomMessageToChatHistory(`${tags["display-name"]} unmuted user "${message}"`);
            return;
        }

        const silentMessageRegex = /^\!s\s/;
        if(message.match(new RegExp(silentMessageRegex)))
        {
            message = message.replace(silentMessageRegex, "");

            addWithFlagToChatHistory("SILENT", "#FAE828", tags["display-name"], tags["color"], `${message}`);
            return;
        }

        const commandsRegex = /^\!/;
        if(message.match(new RegExp(commandsRegex)))
        {
            addWithFlagToChatHistory("IGNORED", "#FF8400", tags["display-name"], tags["color"], `${message}`);
            return;
        }

        if(excluded.includes(tags["display-name"]))
        {
            addWithFlagToChatHistory("MUTED", "#FF3333", tags["display-name"], tags["color"], `${message}`);
            return;
        }

        const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if(message.match(new RegExp(linkRegex)))
        {
            message = message.replace(" ", "");
            addLinkToChatHistory(tags["display-name"], message);
            addToQueue(`${tags["display-name"]} sent a link`);
            return;
        }

        addToChatHistory(tags["display-name"], tags["color"], message);
        addToQueue(message);
    });

    client.on("raided", (channel, username, viewers, tags) =>
    {
        let message = `${username} raided the stream with ${viewers} ${(viewers == 1 ? "viewer" : "viewers")}`;
        addCustomMessageToChatHistory(message);
        addToQueue(message);
    });
}

play();

document.getElementById("play").addEventListener("click", play);

let addToQueue = (message) =>
{
    if(message.toLowerCase().charCodeAt(message.length - 1) == 56320)
        message = message.substring(0, message.length - 3);

    let utterance = new SpeechSynthesisUtterance(message);
    utterance.volume = volume;
    utterance.voice = (sentencesForMultilingual.includes(message.toLowerCase()) && multilingualVoice !== undefined) ? voices[multilingualVoice] : voices[voice];
    synth.speak(utterance);
}

let addWithFlagToChatHistory = (flag, flagColor, name, nameColor, message) =>
{
    let messageList = document.getElementById("messageList");
    let div = document.createElement("div");

    let flagSpan = document.createElement("span");
    flagSpan.innerText = `[${flag}] `;
    flagSpan.style.color = flagColor;
    flagSpan.style.fontWeight = "bold";
    div.appendChild(flagSpan);

    let nickSpan = document.createElement("span");
    nickSpan.innerText = `${name}`;
    nickSpan.style.color = nameColor;
    nickSpan.style.fontWeight = "bold";
    div.appendChild(nickSpan);

    let messageSpan = document.createElement("span");
    messageSpan.innerText = `: ${message}`;
    div.appendChild(messageSpan);
    messageList.appendChild(div);
}

let addCustomMessageToChatHistory = (message) =>
{
    let messageList = document.getElementById("messageList");
    let div = document.createElement("div");

    let messageSpan = document.createElement("span");
    messageSpan.innerText = `${message}`;
    messageSpan.style.color = "#ff3333";
    messageSpan.style.fontWeight = "bold";
    div.appendChild(messageSpan);
    messageList.appendChild(div);
}

let addLinkToChatHistory = (nick, link) =>
{
    let messageList = document.getElementById("messageList");
    let div = document.createElement("div");

    let messageSpan = document.createElement("span");
    messageSpan.style.color = "#ff9b29";
    messageSpan.style.fontWeight = "bold";
    messageSpan.innerText = `${nick} sent a link`;
    div.appendChild(messageSpan);

    let colon = document.createElement("span");
    colon.innerText = `: `;
    div.appendChild(colon);

    let linkElement = document.createElement("a");
    linkElement.href = link;
    linkElement.innerText = `${link}`;
    linkElement.target = "_blank";
    div.appendChild(linkElement);

    messageList.appendChild(div);
}

let addToChatHistory = (name, color, message) =>
{
    let messageList = document.getElementById("messageList");
    let div = document.createElement("div");
    let nickSpan = document.createElement("span");
    nickSpan.innerText = `${name}`;
    nickSpan.style.color = color;
    nickSpan.style.fontWeight = "bold";
    div.appendChild(nickSpan);

    let messageSpan = document.createElement("span");
    messageSpan.innerText = `: ${message}`;
    div.appendChild(messageSpan);
    messageList.appendChild(div);
}

document.getElementById("skip").addEventListener("click", () =>
{
    synth.cancel();
});

document.getElementById("stop").addEventListener("click", () =>
{
    if(client !== undefined)
        client.disconnect();
    synth.cancel();
});

document.getElementById("exclude").addEventListener("click", () =>
{
    let nameInput = document.getElementById("excludeName");
    let name = nameInput.value;
    nameInput.value = "";

    createExcludedButton(name);
});

function createExcludedButton(name)
{
    if(name == "Anonimsko")
        return;

    if(excluded.includes(name))
        return;

    if(name === null || name.trim() === "")
        return;

    excluded.push(name);

    let excludedList = document.getElementById("excludedList");
    let button = document.createElement("button");
    button.innerText = name;
    button.setAttribute("class", "btn btn-light");
    button.setAttribute("id", "btn btn-light");
    button.setAttribute("data-bs-toggle", "tooltip");
    button.setAttribute("data-bs-placement", "right");
    button.setAttribute("title", "Click to delete");
    new bootstrap.Tooltip(button);
    button.addEventListener("click", () =>
    {
        let tooltipInstance = bootstrap.Tooltip.getInstance(button);
        if (tooltipInstance)
            tooltipInstance.dispose();

        excluded.splice(excluded.indexOf(name), 1);
        button.remove();
        localStorage.setItem("excluded", JSON.stringify(excluded));
    });
    excludedButtons.push(button);
    excludedList.appendChild(button);
    localStorage.setItem("excluded", JSON.stringify(excluded));
}