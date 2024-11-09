const synth = window.speechSynthesis;

let voices;
let messages = [];
let voice = 0;
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
        if(item.name == "Microsoft AvaMultilingual Online (Natural) - English (United States)")
        {
            option.selected = true;
            voice = index;
        }
        voicesList.add(option);
    });
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
    volume = volumeElement.value;
});

let play = () =>
{
    synth.cancel();
    
    if(client !== undefined)
        client.disconnect();

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

        const resetRegex = /^\!reset/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] === true)
        {
            addCustomMessageToChatHistory(`${tags["display-name"]} reset the TTS`);
            messages = [];
            synth.cancel();
            return;
        }

        const skipRegex = /^\!skip/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] === true)
        {
            addCustomMessageToChatHistory(`${tags["display-name"]} skipped a message`);
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
        messages.push(message);
    });
}

play();

document.getElementById("play").addEventListener("click", () =>
{
    play();
});

let addToQueue = (message) =>
{
    let utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = voices[voice];
    utterance.volume = volume;
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
    messageSpan.innerText = `${nick} sent a link (`;
    div.appendChild(messageSpan);

    let linkElement = document.createElement("a");
    linkElement.href = link;
    linkElement.innerText = `${link}`;
    linkElement.target = "_blank";
    div.appendChild(linkElement);

    let closeLinkSpan = document.createElement("span");
    closeLinkSpan.innerText = `)`;
    div.appendChild(closeLinkSpan);

    messageList.appendChild(div);
}

let addToChatHistory = (name, color, message) =>
{
    let messageList = document.getElementById("messageList");
    let div = document.createElement("div");
    let nickSpan = document.createElement("span");
    nickSpan.innerText = `${name}`;
    nickSpan.style.color = color;
    div.appendChild(nickSpan);

    let messageSpan = document.createElement("span");
    messageSpan.innerText = `: ${message}`;
    div.appendChild(messageSpan);
    messageList.appendChild(div);
}

setInterval(() => 
{
    if(!synth.speaking && messages.length)
    {
        addToQueue(messages[0]);
        messages.shift();
    }
}, 5);

document.getElementById("skip").addEventListener("click", () =>
{
    synth.cancel();
});

document.getElementById("reset").addEventListener("click", () =>
{
    messages = [];
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