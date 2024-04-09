const searchParams = new URLSearchParams(window.location.search);

let client = new tmi.Client(
{
    connection:
    {
        secure: true,
        reconnect: true
    },
    identity:
    {
    
        username: "CopeBot",
        password: `oauth:${searchParams.get("access_token")}`
    },
    channels: [ "anonimsko" ]
});
client.connect();

client.on("message", (channel, tags, message, self) =>
{
    if(self)
        return;

    if(message.toLowerCase() === '!hello') {
        client.say(channel, `@${tags["display-name"]}, heya!`);
    }
});