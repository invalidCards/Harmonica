import { Discord, Harmonica } from '../../deps.ts';

const command: Harmonica.Command<[Discord.User, boolean]> = {
    name: 'test',
    description: 'A test (send messages permission)',
    botPermissions: ['EMBED_LINKS'],
    userPermissions: ['SEND_MESSAGES'],
    slashResponse: {type: Discord.InteractionResponseType.ACK_WITH_SOURCE},
    arguments: [{
        name: 'person',
        description: 'A guy',
        type: 'user'
    }, {
        name: 'nice',
        description: 'Is this guy nice',
        type: 'boolean'
    }],
    run: (wrapper: Harmonica.BotWrapper, data: Harmonica.CommandData, user: Discord.User, nice: boolean) => {
        data.channel.send(`Hi, ${user.username}. You are ${nice ? '' : 'not '}nice.`);
    }
};

export default command;
