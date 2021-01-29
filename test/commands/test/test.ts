import { Harmonica } from '../../deps.ts';

const command: Harmonica.Command<[string, string, string]> = {
    name: 'test',
    description: 'A test',
    arguments: [{
        name: 'mode',
        description: 'The mode of operation for the command',
        type: 'string'
    }, {
        name: 'commandName',
        description: 'The name of the new command',
        type: 'string',
        optional: true
    }, {
        name: 'content',
        description: 'The content of the new command',
        type: 'string',
        optional: true,
        rest: true
    }],
    run: (wrapper: Harmonica.BotWrapper, data: Harmonica.CommandData, mode: string, commandName?: string, content?: string) => {
        data.channel.send(`The mode is ${mode}, the command name is ${commandName} and the content is ${content}!`);
    }
};

export default command;
