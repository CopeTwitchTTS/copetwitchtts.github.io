const synth = window.speechSynthesis;

let voices;
let voice = undefined;
let multilingualVoice = undefined;
let sentencesForMultilingual = [ "jesus christo", "jesus", "jesus christ", "kys" ];
let channel = "kinessa__";
let volume = 100;
let excluded = [ "Moobot" ];
let client = undefined;

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

    voices.forEach((item, index) =>
    {
        let option = document.createElement("option");
        option.text = `${item.name} (${item.lang})`;
        option.value = index;
        if(item.name == "Microsoft Emily Online (Natural) - English (Ireland)" && voice === undefined)
        {
            option.selected = true;
            voice = index;
        }
        if(item.name == "Microsoft AvaMultilingual Online (Natural) - English (United States)" && multilingualVoice === undefined)
            multilingualVoice = index;
        voicesList.add(option);
    });

    if(voice === undefined)
        voice = 0;
}

let voiceList = document.getElementById("voiceList");
voiceList.addEventListener("change", () =>
{
    voice = voiceList.value;
});

let channelElement = document.getElementById("channel");
channelElement.addEventListener("change", () =>
{
    channel = channelElement.value;
});

let volumeElement = document.getElementById("volume");
volumeElement.addEventListener("change", () =>
{
    volume = volumeElement.value / 100;
});

let play = () =>
{   
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
        if(excluded.includes(tags["display-name"]))
            return;

        const resetRegex = /^\!resetTTS/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] === true)
        {
            addCustomMessageToChatHistory(`${tags["display-name"]} reset the TTS`);
            synth.cancel();
            return;
        }

        const commandsRegex = /^\!/;
        if(message.match(new RegExp(commandsRegex)))
           return;

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

    if(excluded.includes(name))
        return;

    if(name === null || name.trim() === "")
        return;

    excluded.push(name);

    let excludedList = document.getElementById("excludedList");
    let button = document.createElement("button");
    button.innerText = name;
    button.setAttribute("class", "btn btn-light");
    button.addEventListener("click", () =>
    {
        excluded.splice(excluded.indexOf(name), 1);
        button.remove();
    });
    excludedList.appendChild(button);
});

let removeDefaultExcluded = (element) =>
{
    excluded.splice(excluded.indexOf(element.value), 1);
    element.remove();
}