let channel = undefined;
let voice = undefined;
let volume = 0.5;
let followNotifications = false;
let excluded = [];
let username = undefined;
let refreshToken = undefined;
let token = undefined;

const Encrypt = (text, shift) =>
{
    let result = "";
    for (let i = 0; i < text.length; i++)
    {
        let char = text[i];
        if (char.match(/[a-z]/i))
        {
            const code = text.charCodeAt(i);
            if (code >= 65 && code <= 90)
                char = String.fromCharCode(((code - 65 + shift) % 26) + 65);
            else if (code >= 97 && code <= 122)
                char = String.fromCharCode(((code - 97 + shift) % 26) + 97);
        }
        result += char;
    }
    return result;
}

const Decrypt = (text, shift) =>
{
    return Encrypt(text, (26 - shift) % 26);
}

document.addEventListener("DOMContentLoaded", () =>
{
    if(localStorage.getItem("channel") !== null)
    {
        channel = localStorage.getItem("channel");
        document.getElementById("channel").value = channel;
    }

    if(localStorage.getItem("volume") !== null)
    {
        volume = localStorage.getItem("volume");
        document.getElementById("volumeSlider").value = volume * 100;
    }

    if(localStorage.getItem("excluded") !== null)
    {
        JSON.parse(localStorage.getItem("excluded")).forEach((item, index) =>
        {
            CreateExcludedButton(item);
        });
    }

    if(localStorage.getItem("name") !== null)
    {
        username = Decrypt(localStorage.getItem("name"), 11);
        document.getElementById("usernameInput").value = username;
    }

    if(localStorage.getItem("ren") !== null)
    {
        refreshToken = Decrypt(localStorage.getItem("ren"), 14);
        document.getElementById("refreshTokenInput").value = refreshToken;
    }

    if(localStorage.getItem("en") !== null)
    {
        token = Decrypt(localStorage.getItem("en"), 19);
        document.getElementById("tokenInput").value = token;
    }
});