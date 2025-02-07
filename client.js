const synth = window.speechSynthesis;

let voices;
let voice = undefined;
let multilingualVoice = undefined;
let sentencesForMultilingual = [ "jesus christo", "jesus", "jesus christ", "kys" ];
let channel = undefined;
let volume = undefined;
let excluded = [];
let excludedButtons = [];
let client = undefined;

let loadSavedSettings = () =>
{
    document.getElementById("channel").value = localStorage.getItem("channel");
    document.getElementById("volume").value = localStorage.getItem("volume");
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
            synth.cancel();
            return;
        }

        const muteRegex = /^\!mute\s/;
        if(message.match(new RegExp(muteRegex)) && tags["mod"] === true)
        {
            message = message.replace(muteRegex, "");
            if(message == "Anonimsko")
                return;

            createExcludedButton(message);
            addCustomMessageToChatHistory(`${tags["display-name"]} muted user "${message}"`);
            return;
        }

        const unmuteRegex = /^\!unmute\s/;
        if(message.match(new RegExp(unmuteRegex)) && tags["mod"] === true)
        {
            message = message.replace(unmuteRegex, "");
            excludedButtons[excluded.indexOf(message)].remove();
            excludedButtons.splice(excluded.indexOf(message), 1);
            excluded.splice(excluded.indexOf(message), 1);
            addCustomMessageToChatHistory(`${tags["display-name"]} unmuted user "${message}"`);
            return;
        }

        const commandsRegex = /^\!/;
        if(message.match(new RegExp(commandsRegex)))
        {
            addWithFlagToChatHistory("IGNORED", "#ff3333", tags["display-name"], tags["color"], `${message}`);
            return;
        }

        if(excluded.includes(tags["display-name"]))
        {
            addWithFlagToChatHistory("MUTED", "#ff3333", tags["display-name"], tags["color"], `${message}`);
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
}

play();

document.getElementById("play").addEventListener("click", play);

let addToQueue = (message) =>
{
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

let createExcludedButton = (name) =>
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
    button.addEventListener("click", () =>
    {
        excluded.splice(excluded.indexOf(name), 1);
        button.remove();
    });
    excludedButtons.push(button);
    excludedList.appendChild(button);
}
createExcludedButton("Moobot");