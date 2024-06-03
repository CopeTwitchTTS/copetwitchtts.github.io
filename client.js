const synth = window.speechSynthesis;

let voices;
let languages = [];
let channel = "kinessa__";
let voice = 0;
let volume = 100;
let excluded = [ "Moobot" ];
let messages = [];
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
        if(item.name == "Google US English")
        {
            option.selected = true;
            voice = index;
        }
        voicesList.add(option);
        if(item.name.includes("Google"))
            languages.push(item.lang.substring(0, 1));
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

document.getElementById("play").addEventListener("click", () =>
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

        /*languages.forEach((item, index) =>
        {
            if(message.includes(`!${item}`))
                voice = index;
        });*/
        //console.log(message);
        if(message === "!resetTTS" && tags["mod"] === true)
            synth.cancel();
        
        const commandsRegex = /^\!/;
        if(message.match(new RegExp(commandsRegex)))
           return;

        const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if(message.match(new RegExp(linkRegex)))
        {
            handleMessage(tags["display-name"], tags["color"], `${tags["display-name"]} sent a link`);
            return;
        }

        while(true)
        {
            if((message.length <= 200 && message.lastIndexOf(" ") !== -1) || (message.length <= 100 && message.lastIndexOf(" ") === -1))
            {
                addToChatHistory(tags["display-name"], tags["color"], message);
                addToQueue(message);
                break;
            }
            
            let trimmedMessage = message.substring(0, Math.min(message.length, 100));
            let lastSpaceIndex = trimmedMessage.lastIndexOf(" ");
            if(lastSpaceIndex > 100)
            {
                trimmedMessage = trimmedMessage.substring(0, lastSpaceIndex);
                message = message.substring(trimmedMessage.length + 1, message.length);
            }
            else if(lastSpaceIndex === -1)
            {
                trimmedMessage = trimmedMessage.substring(0, 99);
                message = message.substring(trimmedMessage.length, message.length);
            }
            
            addToChatHistory(tags["display-name"], tags["color"], trimmedMessage);
            addToQueue(trimmedMessage);
        }
    });
});

let addToQueue = (message) =>
{
    let utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = voices[voice];
    utterance.volume = volume;
    synth.speak(utterance);
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