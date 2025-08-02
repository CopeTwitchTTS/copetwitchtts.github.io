const excludedUsersButtons = new Map();
const synth = window.speechSynthesis;
let multilingualVoice = undefined;

const ShowTab = (tabId) =>
{
    const tabContents = document.querySelectorAll(".tab-content");

    tabContents.forEach(content =>
    {
        content.classList.remove("active");
    });
    
    const activeTabContent = document.getElementById(tabId);
    if (activeTabContent)
        activeTabContent.classList.add("active");
    
    tabButtons.forEach(button =>
    {
        button.classList.remove("active");
        if (button.getAttribute("data-tab") === tabId)
            button.classList.add("active");
    });
}

const UpdateSliderFill = () =>
{
    const value = volumeSlider.value;
    const min = volumeSlider.min || 0;
    const max = volumeSlider.max || 100;
    const percent = ((value - min) / (max - min)) * 100;
    volumeSlider.style.setProperty("--range-fill", `${percent}%`);
    document.getElementById("volumeValue").textContent = value;
}

const CreateExcludedButton = (name) =>
{
    if(name === "Anonimsko")
        return;

    if(excludedUsersButtons.has(name) === true || excluded.includes(name))
        return;

    if(name === null || name.trim() === "")
        return;

    excluded.push(name);

    const excludedList = document.getElementById("excludedUsersList");
    const button = document.createElement("button");
    button.innerText = name;
    button.setAttribute("class", "btn btn-light w-100 mb-3");
    button.setAttribute("id", "btn btn-light");
    button.setAttribute("data-bs-toggle", "tooltip");
    button.setAttribute("data-bs-placement", "right");
    button.setAttribute("title", "Click to remove");
    button.addEventListener("click", () =>
    {
        let tooltipInstance = bootstrap.Tooltip.getInstance(button);
        if (tooltipInstance)
            tooltipInstance.dispose();

        excluded.splice(excluded.indexOf(name), 1);
        excludedUsersButtons.delete(name);
        button.remove();
        localStorage.setItem("excluded", JSON.stringify(excluded));
    });
    new bootstrap.Tooltip(button);

    excludedUsersButtons.set(name, button);
    excludedList.appendChild(button);
    localStorage.setItem("excluded", JSON.stringify(excluded));
}

const ToggleEyeVisibility = (event) =>
{
    const container = event.currentTarget.closest(".form-floating");
    if (!container)
        return;
    
    const passwordInput = container.querySelector(`input[type="password"], input[type="text"]`);
    if (!passwordInput)
        return;
    
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    
    event.currentTarget.classList.toggle("hidden");
}


document.addEventListener("DOMContentLoaded", () =>
{
    /* Tab Management */
    document.querySelectorAll(".tab-button").forEach(button =>
    {
        button.addEventListener("click", function()
        {
            const tabId = this.getAttribute("data-tab");
            ShowTab(tabId);
        });
    });


    /* Login Input Display Value Manager */
    document.getElementById("loginToggle").addEventListener("click", ToggleEyeVisibility);
    document.getElementById("refreshToggleToken").addEventListener("click", ToggleEyeVisibility);
    document.getElementById("toggleToken").addEventListener("click", ToggleEyeVisibility);
    

    /* Channel */
    document.getElementById("channel").addEventListener("input", (e) =>
    {
        channel = e.currentTarget.value;
        localStorage.setItem("channel", channel);
    });


    /* Voice */
    document.getElementById("voiceList").addEventListener("change", (e) =>
    {
        voice = e.currentTarget.value;
        localStorage.setItem("voice", voices[voice].name);
    });


    /* Volume */
    const volumeSlider = document.getElementById("volumeSlider");
    volumeSlider.addEventListener("input", UpdateSliderFill);
    UpdateSliderFill();
    volumeSlider.addEventListener("change", (e) =>
    {
        volume = e.currentTarget.value / 100;
        localStorage.setItem("volume", volume);
    });
    

    /* Follow Notifications */
    document.getElementById("followNotifications").addEventListener("change", (e) =>
    {
        followNotifications = e.currentTarget.checked;
        localStorage.setItem("followNotifications", followNotifications);
    });

    
    /* Exclude Users */
    document.getElementById("addExcludedUser").addEventListener("click", () =>
    {
        const nameInput = document.getElementById("excludedUserInput");
        let name = nameInput.value;
        nameInput.value = "";

        CreateExcludedButton(name);
    });

    
    /* Username */
    document.getElementById("usernameInput").addEventListener("input", (e) =>
    {
        username = e.currentTarget.value;
        localStorage.setItem("name", Encrypt(username, 11));
    });


    /* Refresh Token */
    document.getElementById("refreshTokenInput").addEventListener("input", (e) =>
    {
        refreshToken = e.currentTarget.value;
        localStorage.setItem("ren", Encrypt(refreshToken, 14));
    });


    /* Token */
    document.getElementById("tokenInput").addEventListener("input", (e) =>
    {
        token = e.currentTarget.value;
        localStorage.setItem("en", Encrypt(token, 19));
    });
});

synth.onvoiceschanged = () =>
{
    voices = synth.getVoices();
    let voicesList = document.getElementById("voiceList");

    for(let i = voicesList.options.length - 1; i >= 0; i--)
        voicesList.remove(i);

    let savedVoice = localStorage.getItem("voice");
    voices.forEach((item, index) =>
    {
        let option = document.createElement("option");
        option.text = `${item.name} (${item.lang})`;
        option.value = index;

        if(item.name == savedVoice)
        {
            option.selected = true;
            voice = index;
        }

        if(item.name == "Microsoft AvaMultilingual Online (Natural) - English (United States)")
            multilingualVoice = index;

        voicesList.add(option);
    });

    if(voice === undefined)
    {
        voicesList.value = 0;
        voice = 0;
    }
}


const GetCurrentTime = () =>
{
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

const AddMessage = (usernameColor, username, message, messageColor = null) =>
{
    const chatContainer = document.getElementById("chatContainer");

    const div = document.createElement("div");
    div.setAttribute("class", "message");

    const divHeader = document.createElement("div");
    divHeader.setAttribute("class", "message-header");

    const span = document.createElement("span")
    span.setAttribute("class", "username");
    span.style.color = usernameColor;
    span.innerText = username;

    const span2 = document.createElement("span");
    span2.setAttribute("class", "timestamp");
    span2.innerText = GetCurrentTime();

    divHeader.appendChild(span);
    divHeader.appendChild(span2);

    const divContent = document.createElement("div");
    divContent.setAttribute("class", "message-content");
    if(messageColor)
        divContent.style.color = messageColor;
    divContent.innerText = message;

    div.appendChild(divHeader);
    div.appendChild(divContent);

    chatContainer.appendChild(div);
}

const AddMessageWithFlag = (flagColor, flag, usernameColor, username, message, messageColor = null) =>
{
    const chatContainer = document.getElementById("chatContainer");

    const div = document.createElement("div");
    div.setAttribute("class", "message");

    const divHeader = document.createElement("div");
    divHeader.setAttribute("class", "message-header");

    const span = document.createElement("span")
    span.setAttribute("class", "username");
    span.style.color = flagColor;
    span.innerText = `[${flag}]`;

    const span2 = document.createElement("span")
    span2.setAttribute("class", "username");
    span2.style.color = usernameColor;
    span2.innerText = username;

    const span3 = document.createElement("span");
    span3.setAttribute("class", "timestamp");
    span3.innerText = GetCurrentTime();

    divHeader.appendChild(span);
    divHeader.appendChild(span2);
    divHeader.appendChild(span3);

    const divContent = document.createElement("div");
    divContent.setAttribute("class", "message-content");
    if(messageColor)
        divContent.style.color = messageColor;
    divContent.innerText = message;

    div.appendChild(divHeader);
    div.appendChild(divContent);

    chatContainer.appendChild(div);
}

const AddMessageWithLink = (usernameColor, username, link) =>
{
    const chatContainer = document.getElementById("chatContainer");

    const div = document.createElement("div");
    div.setAttribute("class", "message");

    const divHeader = document.createElement("div");
    divHeader.setAttribute("class", "message-header");

    const span = document.createElement("span")
    span.setAttribute("class", "username");
    span.style.color = usernameColor;
    span.innerText = username;

    const span2 = document.createElement("span");
    span2.setAttribute("class", "timestamp");
    span2.innerText = GetCurrentTime();

    divHeader.appendChild(span);
    divHeader.appendChild(span2);

    const divContent = document.createElement("div");
    divContent.setAttribute("class", "message-content");

    const span3 = document.createElement("span");
    span3.setAttribute("class", "message-content");
    span3.style.color = "#ff9922";
    span3.innerText = "Link: ";

    const linkElement = document.createElement("a");
    linkElement.href = link;
    linkElement.innerText = `${link}`;
    linkElement.target = "_blank";

    divContent.appendChild(span3);
    divContent.appendChild(linkElement);

    div.appendChild(divHeader);
    div.appendChild(divContent);

    chatContainer.appendChild(div);
}