import { Discord, Harmonica } from '../../deps.ts';

const command: Harmonica.Command<[Discord.GuildTextChannel]> = {
    name: 'test',
    description: 'A test',
    arguments: [{
        name: 'testarg',
        description: 'A test argument',
        type: 'channel'
    }],
    run: (wrapper: Harmonica.BotWrapper, data: Harmonica.CommandData, testarg: Discord.GuildTextChannel) => {
        data.channel.send(`It is ${testarg.name}!`);
    }
};

export default command;
