const synth = window.speechSynthesis;
let running = false;

let voices;
let channel = "kinessa__";
let voice = 3;
let volume = 100;
let excluded = [ "Moobot" ];
let messages = [];

let client = undefined;

synth.onvoiceschanged = () =>
{
    voices = synth.getVoices();
    let voicesList = document.getElementById("voiceList");

    voices.forEach((item, index) =>
    {
        let option = document.createElement("option");
        option.text = `${item.name} (${item.lang})`;
        option.value = index;
        if(item.name == "Google US English")
            option.selected = true;
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

document.getElementById("play").addEventListener("click", () =>
{
    running = true;
    synth.cancel();
    
    if(client !== undefined)
    client.disconnect();

    client = new tmi.Client(
    {
        connection:
        {
            secure: true,
            reconnect: true,
        },
        channels: [ channel ]
    });
    client.connect();

    client.on("message", (channel, tags, message, self) =>
    {
        const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if(message.match(new RegExp(regex)))
            return;

        if(excluded.includes(tags["display-name"]))
            return;

        //handleMessage(tags["display-name"], tags["color"], message);

        while(true)
        {
            if(message.length < 200)
            {
                handleMessage(tags["display-name"], tags["color"], message);
                break;
            }
            
            let trimmedMessage = message.substring(0, Math.min(message.length, 200));
            let lastSpaceIndex = trimmedMessage.lastIndexOf(" ");
            if(lastSpaceIndex > 150)
                trimmedMessage = trimmedMessage.substring(0, lastSpaceIndex);
            
            message = message.substring(trimmedMessage.length + 1, message.length);
            handleMessage(tags["display-name"], tags["color"], trimmedMessage);
            if(message.length == 0)
                break;
        }
    });
});

let handleMessage = (name, color, message) =>
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

    let utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = voices[voice];
    utterance.volume = volume;
    synth.speak(utterance);
}

document.getElementById("skip").addEventListener("click", () =>
{
    synth.cancel();
});

document.getElementById("stop").addEventListener("click", () =>
{
    running = false;
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