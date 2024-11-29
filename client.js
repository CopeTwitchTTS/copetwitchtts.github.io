const synth = window.speechSynthesis;

let voices;
let voice = 0;
let channel = "anonimsko";
let volume = 100;
let excluded = [ "Moobot" ];
let client = undefined;

let songs = [];
var player;

let clearSelect = (element) =>
{
    for(let i = element.options.length - 1; i >= 0; i--)
        element.remove(i);
}

window.onload = (event) =>
{
    let ttsPage = document.getElementById("ttsPage");
    let srPage = document.getElementById("srPage");

    //ttsPage.style.display = "none";
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

        const resetRegex = /^\!resetTTS/;
        if(message.match(new RegExp(resetRegex)) && tags["mod"] === true)
        {
            addCustomMessageToChatHistory(`${tags["display-name"]} reset the TTS`);
            synth.cancel();
            return;
        }

        const playAudioRegex = /^\!play /;
        if(message.match(new RegExp(playAudioRegex)))
        {
            message = message.replace(playAudioRegex, "");

            let audioPlayer = document.getElementById("audioPlayer");
            audioPlayer.src = message;

            let checkInterval = setInterval(() =>
            {
                if(synth.speaking)
                    return;
            
                clearInterval(checkInterval);
                synth.pause();
                audioPlayerPlay(audioPlayer);
            }, 50);
            return;
        }

        const songRequestRegex = /^\!sr /;
        if(message.match(new RegExp(songRequestRegex)))
        {
            message = message.replace(songRequestRegex, "");

            let id = extractIdFromLink(message);
            songs.push(id);
            if(songs.length == 0)
                player.loadVideoById(id);

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
});

let audioPlayerPlay = (audioPlayer) =>
{
    audioPlayer.play();
    let interval = setInterval(() =>
    {
        if(!audioPlayer.ended)
            return;
    
        synth.cancel();
        clearInterval(interval);
    }, 10)
}

let addToQueue = (message) =>
{
    let utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = voices[voice];
    utterance.volume = volume;
    synth.speak(utterance);
    console.log("speak: " + message);
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








var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let extractIdFromLink = (link) =>
{
    let regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = link.match(regExp);
    console.log(match[2]);
    if (match && match[2].length == 11)
        return match[2];
    else
        console.error("Failed to extract the video Id");
}

function onYouTubeIframeAPIReady()
{
    console.log("run")
    player = new YT.Player("player",
    {
        height: "40%",
        width: "35%",
        videoId: "wyYNDI1kgYY",
        playerVars:
        { 
            "autoplay": 1
        },
        events:
        {
            "onReady": onPlayerReady,
            "onStateChange": onPlayerStateChange
        }
    });
}

function onPlayerReady(event)
{
    event.target.playVideo();
}

function onPlayerStateChange(event)
{
    if (event.data != YT.PlayerState.ENDED)
        return;

    songs.shift();

    if(songs.length == 0)
        return;

    let id = extractIdFromLink(songs[0]);
    player.loadVideoById(id);
}

let addSongToList = (id) =>
{
    let songList = document.getElementById("songs");

    let div = document.createElement("div");
    let nickSpan = document.createElement("span");
    nickSpan.innerText = `${name}`;
    nickSpan.style.color = color;
    div.appendChild(nickSpan);

    let messageSpan = document.createElement("span");
    messageSpan.innerText = `: ${message}`;
    div.appendChild(messageSpan);
    songList.appendChild(div);
}