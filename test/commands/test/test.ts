import { Discord, Harmonica } from '../../deps.ts';

const command: Harmonica.Command<[]> = {
    name: 'test',
    description: 'A test (send messages permission)',
    botPermissions: ['EMBED_LINKS'],
    userPermissions: ['SEND_MESSAGES'],
    run: (wrapper: Harmonica.BotWrapper, data: Harmonica.CommandData) => {
        data.channel.send('Hi!');
    }
};

export default command;
