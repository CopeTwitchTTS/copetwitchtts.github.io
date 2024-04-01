const synth = window.speechSynthesis;
let running = false;
let voices;
let voice = 0;
let volume = 100;
let excluded = [];
let messages = [];

let getData = () =>
{
    getSavedChannel();
    getSavedVoice();
    getSavedVolume();
    getSavedExcluded();
}

synth.onvoiceschanged = () =>
{
    voices = synth.getVoices();
    let voicesList = document.getElementById("voiceList");

    voices.forEach((item, index) =>
    {
        let option = document.createElement("option");
        option.text = `${item.name} (${item.lang})`;
        option.value = index;
        voicesList.add(option);
    });
}

let getSavedChannel = () =>
{
    fetch(`http://localhost:1212/channel`, 
    {
        method: "GET",
        redirect: "manual"
    })
    .then(response => response.json())
    .then(data => 
    {
        document.getElementById("channel").value = data.channel;
    })
    .catch(() => console.log("Unable to connect to the api"));
}

let getSavedVoice = () =>
{
    fetch(`http://localhost:1212/voice`, 
    {
        method: "GET",
        redirect: "manual"
    })
    .then(response => response.json())
    .then(data => 
    {
        voice = data.voice;
        document.getElementById("voiceList").selectedIndex = voice;
    })
    .catch(() => console.log("Unable to connect to the api"));
}

let getSavedVolume = () =>
{
    fetch(`http://localhost:1212/volume`, 
    {
        method: "GET",
        redirect: "manual"
    })
    .then(response => response.json())
    .then(data => 
    {
        volume = data.volume;
        document.getElementById("volume").value = volume;
    })
    .catch(() => console.log("Unable to connect to the api"));
}

let getSavedExcluded = () =>
{
    fetch(`http://localhost:1212/excluded`, 
    {
        method: "GET",
        redirect: "manual"
    })
    .then(response => response.json())
    .then(data => 
    {
        excluded = data.excluded;
        let excludedList = document.getElementById("excludedList");
        excluded.forEach((item, index) =>
        {
            let button = document.createElement("button");
            button.innerText = item;
            button.setAttribute("class", "btn btn-light");
            button.addEventListener("click", () =>
            {
                fetch(`http://localhost:1212/excluded/${item}`, 
                {
                    method: "DELETE",
                    redirect: "manual"
                });

                excluded.splice(excluded.indexOf(item), 1);
                button.remove();
            });
            excludedList.appendChild(button);
        })
    })
    .catch(() => console.log("Unable to connect to the api"));
}

let voiceList = document.getElementById("voiceList");
voiceList.addEventListener("change", () =>
{
    voice = voiceList.value;
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
    let channel = document.getElementById("channel").value;
    fetch(`http://localhost:1212/connect?channel=${channel}&voice=${voice}&volume=${volume}`, 
    {
        method: "PUT",
        redirect: "manual"
    })
    .catch(() => console.log("Unable to connect to the api"));
});

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

    fetch(`http://localhost:1212/excluded/${name}`, 
    {
        method: "POST",
        redirect: "manual"
    })
    .catch(() => console.log("Unable to connect to the api"));
    excluded.push(name);

    let excludedList = document.getElementById("excludedList");
    let button = document.createElement("button");
    button.innerText = name;
    button.setAttribute("class", "btn btn-light");
    button.addEventListener("click", () =>
    {
        fetch(`http://localhost:1212/excluded/${name}`, 
        {
            method: "DELETE",
            redirect: "manual"
        })
        .catch(() => console.log("Unable to connect to the api"));

        excluded.splice(excluded.indexOf(name), 1);
        button.remove();
    });
    excludedList.appendChild(button);
});

setInterval(() =>
{
    if(!running)
        return;

    fetch(`http://localhost:1212/message`, 
    {
        method: "GET",
        redirect: "manual"
    })
    .then(response => response.json())
    .then(data => 
    {
        let messageList = document.getElementById("messageList");
        data.messages.forEach((item, index) =>
        {
            let div = document.createElement("div");
            let nickSpan = document.createElement("span");
            nickSpan.innerText = `${item.nick}: `;
            nickSpan.style.color = item.color;
            div.appendChild(nickSpan);

            let messageSpan = document.createElement("span");
            messageSpan.innerText = item.message;
            div.appendChild(messageSpan);
            messageList.appendChild(div);

            let utterance = new SpeechSynthesisUtterance(item.message);
            utterance.voice = voices[voice];
            utterance.volume = volume;
            synth.speak(utterance);
        })
    })
    .catch(() => console.log("Unable to connect to the api"));
}, 100)