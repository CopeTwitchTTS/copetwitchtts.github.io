class Logger
{
    constructor(flushEnabled)
    {
        this.flushEnabled = flushEnabled ?? false;
        this.buffer = [];
    }

    JSON(json)
    {
        const data = {};
        for (const key in json)
            data[key] = json[key];

        return JSON.stringify(data, null, 4);
    }

    SetFlushState(state)
    {
        this.flushEnabled = state;

        if(!state)
            return;

        this.buffer.forEach((item, index, arr) =>
        {
            console.log(item);
        });
        this.buffer = [];
    }

    Push(message)
    {
        if(this.flushEnabled)
        {
            console.log(message);
            return;
        }
        
        this.buffer.push(message);
    }
}