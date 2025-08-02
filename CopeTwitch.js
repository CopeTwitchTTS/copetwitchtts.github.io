class CopeTwitch
{
    constructor(params)
    {
        this.username = params.identity.username ?? null;
        this.token = params.identity.token ?? null;
        this.refreshToken = params.identity.refreshToken ?? null;
        this.channel = params.channel ?? null;
        this.debug = params.options.debug ?? false;
        this.clientId = null;
        this.broadcasterId = null;
        this.permissions = [];
        this._loggedIn = false;
        this._lastFollowers = [];
        this._followCheckInterval = null;
        this._wsLink = "wss://irc-ws.chat.twitch.tv:443";
        this._socket = null;
        this._events = {};
    }

    async _getAccountInfo()
    {
        try
        {
            const response = await fetch("https://id.twitch.tv/oauth2/validate",
            {
                method: "GET",
                headers: { "Authorization": `Bearer ${this.token}` }
            });

            if(!response.ok)
                return false;

            const data = await response.json();
            this.clientId = data.client_id;
            this.broadcasterId = data.user_id;
            this.permissions = data.scopes;

            return true;
        }
        catch(error)
        {
            console.error("Account validation failed:", error);
            return false;
        }
    }

    async _refreshToken()
    {
        try
        {
            const response = await fetch(`https://twitchtokengenerator.com/api/refresh/${this.refreshToken}`,
            {
                method: "POST"
            });

            if(!response.ok)
                return false;

            const data = await response.json();

            if(!data.success)
                return false;

            if(this.debug)
                console.log("Token has been refreshed");

            this.token = data.token;
            this.Emit("token_changed", this.token);

            return true;
        }
        catch(error)
        {
            console.error("Token refresh failed:", error);
            return false;
        }
    }

    async _validateCredentials(maxAttempts = 2)
    {
        for (let attempt = 0; attempt < maxAttempts; attempt++)
        {
            if (await this._getAccountInfo()) return true;
            if (!await this._refreshToken()) return false;
        }

        return false;
    }

    async Connect()
    {
        if (!this.channel)
            throw new Error("No channel provided");

        if(this.token)
        {
            const requiredCredentials =
            {
                username: "No username provided",
                refreshToken: "No refresh token provided",
                token: "No token provided"
            };

            for (const [field, errorMessage] of Object.entries(requiredCredentials))
            {
                if (!this[field])
                    throw new Error(errorMessage);
            }
                
            if (!await this._validateCredentials())
                throw new Error("Failed to validate the account after multiple attempts");

            this._loggedIn = true;
        }
        else if(this.token === null)
            this.username = `justinfan${Math.floor((Math.random() * 80000) + 1000)}`;

        this._socket = new WebSocket(this._wsLink);

        this._socket.onopen = () =>
        {
            this._send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
            if(this._loggedIn)
                this._send(`PASS oauth:${this.token}`);
            this._send(`NICK ${this.username}`);
            this._send(`JOIN #${this.channel}`);

            if(this.debug)
            {
                console.log(`Connecting to: ${this._wsLink}`);
                console.log(`You are currently ${this._loggedIn ? "" : "not "}logged in`)
            }  
        }

        this._socket.onmessage = (event) => this._handleMessage(event.data);
        this._socket.onclose = (event) => this.Emit("disconnected", event);
        this._socket.onerror = (error) => this.Emit("error", error);

        if(this._loggedIn)
            this._trackFollowers();
    }

    Disconnect()
    {
        if(!this._socket)
            return;

        if(this._followCheckInterval)
        {
            clearInterval(this._followCheckInterval);
            this._followCheckInterval = null;
        }

        this._socket.close();
        this._socket = null;
    }

    On(event, listener)
    {
        if(!this._events[event])
            this._events[event] = [];

        this._events[event].push(listener);
    }

    Emit(event, ...args)
    {
        const listeners = this._events[event];
        if(listeners)
            listeners.forEach(listener => listener(...args));
    }

    _send(command)
    {
        this._socket?.send(command);
    }

    _handleMessage(raw)
    {
        if(raw.startsWith("PING :tmi.twitch.tv"))
        {
            this._send("PONG :tmi.twitch.tv");
            return;
        }

        const message = this._parseMessage(raw);
        if(!message)
            return;

        switch(message.command)
        {
            case "002":
			case "003":
			case "004":
            case "353":
			case "372":
			case "375":
            case "376":
			case "CAP":
				break;

            case "001":
                this.Emit("connected",
                    this._socket.url,
                    this._loggedIn,
                    this.channel
                );
                break;

            case "PRIVMSG":
                this.Emit("message",
                    message.channel,
                    message.tags,
                    message.content,
                    message.self
                );
                break;

            case "WHISPER":
                this.Emit("whisper",
                    message.channel,
                    message.tags,
                    message.content
                );
                break;
            
            case "JOIN":
                this.Emit("join",
                    message.channel,
                    message.username
                );
                break;

            case "PART":
                this.Emit("part",
                    message.channel,
                    message.username
                );
                break;

            case "CLEARCHAT":
                this.Emit("chat_cleared",
                    this.channel
                );
                break;

            case "CLEARMSG":
                this.Emit("message_deleted",
                    this.tags["login"],
                    this.content,
                    this.tags["target-msg-id"]
                );
                break;

            case "ROOMSTATE":
                if(Object.hasOwn(message.tags, "followers-only"))
                {
                    this.Emit("followers_only",
                        message.tags["followers-only"] == -1 ? false : true,
                        message.tags["followers-only"]
                    );
                }
                else if(Object.hasOwn(message.tags, "subs-only"))
                {
                    this.Emit("subscribers_only",
                        message.tags["subs-only"] == 1 ? true : false
                    );
                }
                else if(Object.hasOwn(message.tags, "emote-only"))
                {
                    this.Emit("emotes_only",
                        message.tags["emote-only"] == 1 ? true : false
                    );
                }
                else if(Object.hasOwn(message.tags, "slow"))
                {
                    this.Emit("slow_mode",
                        message.tags["slow"] == 0 ? false : true,
                        message.tags["slow"]
                    );
                }
                else
                    console.log(`Unhandled ROOMSTATE message from the server: \n${JSON.stringify(message, null, 4)}`);

                break;

            case "USERSTATE":
                break;

            case "NOTICE":
                switch(message.tags["msg-id"])
                {
                    case "subs_on":
                    case "subs_off":
                        break;

                    case "emote_only_on":
                    case "emote_only_off":
                        break;

                    case "slow_on":
                    case "slow_off":
                        break;

                    case "followers_on_zero":
                    case "followers_on":
                    case "followers_off":
                        break;

                    default:
                        console.log(`Unhandled NOTICE message from the server: \n${JSON.stringify(message, null, 4)}`);
                        break;
                }

                break;
            
            case "RECONNECT":
                console.log("Received RECONNECT request from Twitch");
                this.Disconnect();
                setTimeout(() =>
                {
                    this.Connect();
                }, 1000);
                break;

            default:
                console.log(`Unhandled message from the server: \n${JSON.stringify(message, null, 4)}`);
                break;
        }
    }

    _clearMessage(message)
    {
        if(!message || typeof message !== "string")
			return message;

		return message.replace(/\n|\r|\udb40|\udc00/g, "")
        .replace(/\s/g, " ")
        .replace(/;/g, ";")
        .replace(/\\/g, "\\").trim();
    }

    _parseMessage(raw)
    {
        const parts = raw.split(" ");
        let tags = {};
        let offset = 0;

        if(parts[0].startsWith("@"))
        {
            parts[0].slice(1).split(";").forEach(tag =>
            {
                const [key, value] = tag.split("=");
                tags[key] = value || "";
            });
            offset = 1;
        }

        const prefix = parts[offset] || "";
        const command = parts[offset + 1] || "";
        const channel = parts[offset + 2] || "";
        const content = raw.split(`${command} ${channel} :`)[1] || "";
        
        return{
            tags,
            username: prefix.split("!")[0]?.replace(/^:/, "") || "",
            command,
            channel: channel.split(":")[0]?.replace(/^#|^:/, "").replace(/\n|\r/g, "") || "",
            content: this._clearMessage(content),
            self: prefix.startsWith(`:${this.username}`),
            raw
        };
    }

    async _trackFollowers(interval = 2000)
    {
        if(this._followCheckInterval)
            clearInterval(this._followCheckInterval);

        await this._fetchNewFollowers();

        this._followCheckInterval = setInterval(async () =>
        {
            if(!this._socket)
                return;

            try
            {
                const newFollowers = await this._fetchNewFollowers();

                newFollowers.forEach(follower =>
                {
                    this.Emit("follow",
                        follower.user_login,
                        follower.user_name
                    );
                });
            }
            catch(error)
            {
                console.error(`Failed to fetch followers: ${error}`);
            }
        }, interval);
    }

    async _fetchNewFollowers()
    {
        if(!this.permissions.includes("moderator:read:followers") && this._followCheckInterval)
        {
            clearInterval(this._followCheckInterval);
            this._followCheckInterval = null;
            return [];
        }
            
        try
        {
            const response = await fetch(
            `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${this.broadcasterId}&first=5`,
            {
                method: "GET",
                headers:
                {
                    "Authorization": `Bearer ${this.token}`,
                    "Client-Id": `${this.clientId}`,
                }
            });

            if (!response.ok)
            {
                const error = await response.json();
                throw new Error(`Twitch API Error: ${error.message || response.status}`);
            }
            
            const data = await response.json();
            const currentFollowers = Object.values(data.data) ?? [];

            let newFollowers = [];
            currentFollowers.forEach(follower =>
            {
                const followDate = new Date(follower.followed_at);
                const now = new Date();
                
                const isRecentFollow = (now - followDate) < 5000;

                const isNewFollow = !this._lastFollowers?.some(
                    oldFollower => oldFollower.user_id === follower.user_id
                );

                if(isRecentFollow && isNewFollow)
                    newFollowers.push(follower);
            });

            this._lastFollowers = currentFollowers;
            return newFollowers;
        }
        catch(error)
        {
            return [];
        }
    }

    Say(channel, message)
    {
        if(!this._socket || !this._loggedIn)
            return;

        if(message.length > 500)
        {
            const maxLength = 500;
            const msg = message;
            let lastSpace = msg.slice(0, maxLength).lastIndexOf(" ");

            if(lastSpace === -1)
                lastSpace = maxLength;

            message = msg.slice(0, lastSpace);

            setTimeout(() =>
            {
                this.Say(channel, msg.slice(lastSpace));
            }, 350);
        }

        this._send(`PRIVMSG #${channel} :${message}`);
    }

    async Whisper(id, message)
    {
        if(!this.permissions.includes("user:manage:whispers") || !this._loggedIn)
            return;

        if(message.length > 500)
        {
            const maxLength = 500;
            const msg = message;
            let lastSpace = msg.slice(0, maxLength).lastIndexOf(" ");

            if(lastSpace === -1)
                lastSpace = maxLength;

            message = msg.slice(0, lastSpace);

            setTimeout(() =>
            {
                this.Whisper(id, msg.slice(lastSpace));
            }, 350);
        }

        const response = await fetch(
        `https://api.twitch.tv/helix/whispers?from_user_id=${this.broadcasterId}&to_user_id=${id}`,
        {
            method: "POST",
            headers:
            {
                "Authorization": `Bearer ${this.token}`,
                "Client-Id": `${this.clientId}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
                message: message
            })
        });

        if (!response.ok)
        {
            const error = await response.json();
            throw new Error(`Twitch API Error: ${error.message || response.status}`);
        }
    }

    PermissionList(channel)
    {
        this.Say(channel, this.permissions.join(", "));
    }

    async Ban(id, duration = null, reason = null)
    {
        if(!this.permissions.includes("moderator:manage:banned_users") || !this._loggedIn)
            return;

        const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${this.broadcasterId}&moderator_id=${this.broadcasterId}`,
        {
            method: "POST",
            headers:
            {
                "Authorization": `Bearer ${this.token}`,
                "Client-Id": `${this.clientId}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
            {
                data:
                {
                    user_id: id,
                    reason: reason ?? "Reason not specified",
                    ...(duration !== null && { duration })
                }
            })
        });

        if (!response.ok)
        {
            const error = await response.json();
            throw new Error(`Twitch API Error: ${error.message || response.status}`);
        }
    }

    async Unban(id)
    {
        if(!this.permissions.includes("moderator:manage:banned_users") || !this._loggedIn)
            return;

        const response = await fetch(
        `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${this.broadcasterId}&moderator_id=${this.broadcasterId}&user_id=${id}`,
        {
            method: "DELETE",
            headers:
            {
                "Authorization": `Bearer ${this.token}`,
                "Client-Id": `${this.clientId}`,
            }
        });

        if (!response.ok)
        {
            const error = await response.json();
            throw new Error(`Twitch API Error: ${error.message || response.status}`);
        }
    }

    async DeleteMessage(id)
    {
        if(!this.permissions.includes("moderator:manage:chat_messages") || !this._loggedIn)
            return;

        const response = await fetch(
        `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${this.broadcasterId}&moderator_id=${this.broadcasterId}&message_id=${id}`,
        {
            method: "DELETE",
            headers:
            {
                "Authorization": `Bearer ${this.token}`,
                "Client-Id": `${this.clientId}`,
            }
        });

        if (!response.ok)
        {
            const error = await response.json();
            throw new Error(`Twitch API Error: ${error.message || response.status}`);
        }
    }
}
